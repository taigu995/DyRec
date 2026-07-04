import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

/**
 * GET /api/convert/download
 * 下载转换后的视频文件
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json(
        { success: false, error: '缺少文件路径' },
        { status: 400 }
      );
    }

    // 安全检查：确保文件在允许的目录内
    const normalizedPath = path.normalize(filePath);
    const tempDir = path.join(process.cwd(), '.temp', 'convert');
    
    if (!normalizedPath.startsWith(tempDir)) {
      return NextResponse.json(
        { success: false, error: '非法的文件路径' },
        { status: 403 }
      );
    }

    // 读取文件
    const buffer = await readFile(normalizedPath);
    const stats = await stat(normalizedPath);
    
    // 获取文件扩展名
    const ext = path.extname(normalizedPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.mp4':
        contentType = 'video/mp4';
        break;
      case '.mkv':
        contentType = 'video/x-matroska';
        break;
      case '.flv':
        contentType = 'video/x-flv';
        break;
      case '.webm':
        contentType = 'video/webm';
        break;
    }

    // 返回文件
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `attachment; filename="${path.basename(normalizedPath)}"`,
      },
    });
  } catch (error) {
    console.error('下载失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '下载失败' 
      },
      { status: 500 }
    );
  }
}
