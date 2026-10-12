/**
 * Emails a feedback message as it arrives.
 *
 * Supabase fires a Database Webhook on every insert into public.feedback and
 * POSTs the new row here; this forwards it through Resend. Nothing in the
 * game calls this endpoint.
 *
 * Environment variables (set in Vercel):
 *   RESEND_API_KEY          a Resend API key
 *   FEEDBACK_NOTIFY_SECRET  shared secret, sent by the webhook as a header
 *   FEEDBACK_TO             where to send the notification
 *   FEEDBACK_FROM           optional sender, must be on the verified domain
 */

const FROM_DEFAULT = 'Intersections <noreply@intersectionsgame.com>';

// Keep a stray essay out of the email body; the table still has all of it.
function clamp(text, max) {
    const s = String(text == null ? '' : text);
    return s.length > max ? s.slice(0, max) + '… [truncated]' : s;
}

function escapeHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function readBody(req) {
    // Vercel parses JSON bodies, but a webhook may arrive with another
    // content type, so fall back to reading the stream.
    if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
    if (typeof req.body === 'string') {
        try { return Promise.resolve(JSON.parse(req.body)); } catch (e) { return Promise.resolve({}); }
    }
    return new Promise(resolve => {
        let raw = '';
        req.on('data', c => { raw += c; if (raw.length > 100000) req.destroy(); });
        req.on('end', () => {
            try { resolve(JSON.parse(raw)); } catch (e) { resolve({}); }
        });
        req.on('error', () => resolve({}));
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Without this the endpoint is a free email cannon for anyone who finds
    // the URL. Compared before anything else is read.
    const expected = process.env.FEEDBACK_NOTIFY_SECRET;
    const given = req.headers['x-feedback-secret'];
    if (!expected || given !== expected) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.FEEDBACK_TO;
    if (!apiKey || !to) {
        console.error('feedback-notify: RESEND_API_KEY or FEEDBACK_TO is not set');
        return res.status(500).json({ error: 'Not configured' });
    }

    const body = await readBody(req);
    const row = body.record || body.new || body;          // Supabase sends { record }
    const message = clamp(row.message, 4000);
    const ctx = row.context || {};

    const lines = [
        message,
        '',
        '---',
        'Puzzle:   ' + (ctx.date || 'n/a') + (ctx.mode ? '  (' + ctx.mode + ')' : ''),
        'Progress: ' + (ctx.gameOver ? 'finished' : 'mid-game') +
            (ctx.guesses != null ? ', ' + ctx.guesses + ' guesses' : '') +
            (ctx.usedDirections ? ', asked directions' : ''),
        'Answers:  ' + (Array.isArray(ctx.words) ? ctx.words.join(' / ') : 'not revealed'),
        'Screen:   ' + (ctx.screen || 'n/a'),
        'Browser:  ' + clamp(ctx.ua, 300),
        'Version:  ' + (ctx.version || 'n/a'),
        'Signed in: ' + (row.user_id ? 'yes (' + row.user_id + ')' : 'no'),
        'Sent:     ' + (row.created_at || new Date().toISOString())
    ];

    const subject = 'Honk: ' + clamp(message.replace(/\s+/g, ' '), 60);

    try {
        const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: process.env.FEEDBACK_FROM || FROM_DEFAULT,
                to: [to],
                subject: subject,
                text: lines.join('\n'),
                html: '<p style="white-space:pre-wrap;font-size:15px">' +
                      escapeHtml(message) + '</p><hr>' +
                      '<pre style="font:12px/1.5 monospace;color:#555">' +
                      escapeHtml(lines.slice(3).join('\n')) + '</pre>'
            })
        });

        if (!resp.ok) {
            const detail = await resp.text();
            console.error('feedback-notify: Resend rejected the send', resp.status, detail);
            // 200 regardless: a failed email must not make Supabase retry
            // forever, and the message is already safe in the table.
            return res.status(200).json({ ok: false, status: resp.status });
        }
        return res.status(200).json({ ok: true });
    } catch (e) {
        console.error('feedback-notify: send failed', e);
        return res.status(200).json({ ok: false });
    }
};
