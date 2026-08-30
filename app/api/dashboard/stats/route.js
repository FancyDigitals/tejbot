import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db/index.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // 1. Fetch Aggregated Metrics
    const metricsRes = await query(`
      SELECT
        (SELECT COUNT(*) FROM conversations) AS total_conversations,
        (SELECT COUNT(*) FROM conversations WHERE updated_at >= CURRENT_DATE) AS today_conversations,
        (SELECT COUNT(*) FROM leads WHERE status = 'NEW') AS new_leads,
        (SELECT COUNT(*) FROM leads WHERE lead_temperature = 'HOT') AS hot_leads,
        (SELECT COUNT(*) FROM leads WHERE lead_temperature = 'WARM') AS warm_leads,
        (SELECT COUNT(*) FROM conversations WHERE state = 'HUMAN_REQUIRED') AS awaiting_response,
        (SELECT COUNT(*) FROM leads WHERE status IN ('REGISTERED', 'CUSTOMER')) AS converted_leads
    `);

    const rawMetrics = metricsRes.rows[0] || {};

    // 2. Fetch Real Recent Conversations
    const conversationsRes = await query(`
      SELECT
        c.id,
        c.state,
        c.updated_at,
        COALESCE(cust.name, 'Customer') AS name,
        cust.phone,
        COALESCE(l.lead_temperature, 'COLD') AS lead_temperature,
        COALESCE(l.lead_score, 0) AS lead_score,
        COALESCE(
          (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
          'Conversation initiated'
        ) AS last_message,
        COALESCE(
          (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
          c.updated_at
        ) AS last_message_time
      FROM conversations c
      JOIN customers cust ON c.customer_id = cust.id
      LEFT JOIN leads l ON l.customer_id = cust.id
      ORDER BY c.updated_at DESC
      LIMIT 10
    `);

    // 3. Fetch Real Scheduled Follow-ups
    const followUpsRes = await query(`
      SELECT
        f.id,
        f.scheduled_for,
        f.message_template,
        f.status,
        COALESCE(cust.name, 'Customer') AS name,
        COALESCE(l.interested_course, 'German Language Programme') AS course
      FROM follow_ups f
      JOIN leads l ON f.lead_id = l.id
      JOIN customers cust ON l.customer_id = cust.id
      WHERE f.status = 'PENDING'
      ORDER BY f.scheduled_for ASC
      LIMIT 5
    `);

    return NextResponse.json({
      metrics: {
        todayConversations: parseInt(rawMetrics.today_conversations || rawMetrics.total_conversations || 0, 10),
        totalConversations: parseInt(rawMetrics.total_conversations || 0, 10),
        newLeads: parseInt(rawMetrics.new_leads || 0, 10),
        hotLeads: parseInt(rawMetrics.hot_leads || 0, 10),
        warmLeads: parseInt(rawMetrics.warm_leads || 0, 10),
        awaitingResponse: parseInt(rawMetrics.awaiting_response || 0, 10),
        converted: parseInt(rawMetrics.converted_leads || 0, 10),
      },
      recentConversations: conversationsRes.rows,
      followUpsDue: followUpsRes.rows,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error('[DASHBOARD STATS API ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}