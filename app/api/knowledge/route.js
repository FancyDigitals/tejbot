import { NextResponse } from 'next/server';
import { query } from '../../../lib/db/index.js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await query(`
      SELECT *
      FROM knowledge_items
      ORDER BY priority DESC, title ASC
    `);

    return NextResponse.json(res.rows);
  } catch (error) {
    console.error('[KNOWLEDGE GET]', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const title = String(body.title || '').trim();
    const category = String(body.category || 'general').trim();
    const content = String(body.content || '').trim();
    const priority = Math.min(
      10,
      Math.max(0, parseInt(body.priority, 10) || 5)
    );

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required.' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    const result = await query(
      `
        INSERT INTO knowledge_items
          (id, title, category, content, is_published, priority)
        VALUES
          ($1, $2, $3, $4, TRUE, $5)
        RETURNING *
      `,
      [id, title, category, content, priority]
    );

    return NextResponse.json({
      success: true,
      item: result.rows[0],
    });
  } catch (error) {
    console.error('[KNOWLEDGE POST]', error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();

    const id = String(body.id || '').trim();
    const title = String(body.title || '').trim();
    const category = String(body.category || 'general').trim();
    const content = String(body.content || '').trim();
    const priority = Math.min(
      10,
      Math.max(0, parseInt(body.priority, 10) || 5)
    );

    if (!id) {
      return NextResponse.json(
        { error: 'Knowledge item ID is required.' },
        { status: 400 }
      );
    }

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required.' },
        { status: 400 }
      );
    }

    const result = await query(
      `
        UPDATE knowledge_items
        SET
          title = $1,
          category = $2,
          content = $3,
          priority = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `,
      [
        title,
        category,
        content,
        priority,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Knowledge item not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      item: result.rows[0],
    });
  } catch (error) {
    console.error('[KNOWLEDGE PUT]', error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

    const id = String(body.id || '').trim();

    if (!id) {
      return NextResponse.json(
        { error: 'Knowledge item ID is required.' },
        { status: 400 }
      );
    }

    if (typeof body.is_published !== 'boolean') {
      return NextResponse.json(
        { error: 'is_published must be boolean.' },
        { status: 400 }
      );
    }

    const result = await query(
      `
        UPDATE knowledge_items
        SET
          is_published = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `,
      [body.is_published, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Knowledge item not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      item: result.rows[0],
    });
  } catch (error) {
    console.error('[KNOWLEDGE PATCH]', error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Knowledge item ID is required.' },
        { status: 400 }
      );
    }

    const result = await query(
      `
        DELETE FROM knowledge_items
        WHERE id = $1
        RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Knowledge item not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (error) {
    console.error('[KNOWLEDGE DELETE]', error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}