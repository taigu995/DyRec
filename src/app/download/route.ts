import { NextResponse } from 'next/server';
import { createReadStream, existsSync, statSync } from 'fs';
import { join } from 'path';

export async function GET() {
  const filePath = join(process.cwd(), 'dist-portable', 'DyRec.zip');
  
  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }

  const stat = statSync(filePath);
  const stream = createReadStream(filePath);

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="DyRec.zip"',
      'Content-Length': stat.size.toString(),
    },
  });
}
