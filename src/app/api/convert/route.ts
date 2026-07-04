import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);

/**
 * 检查 FFmpeg 是否可用
 */
async function checkFFmpeg(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('ffmpeg -version');
    const match = stdout.match(/ffmpeg version ([\d.]+)/);
    return match ? match[1] : 'unknown';
  } catch {
    return null;
  }
}

/**
 * 转换视频格式
 */
async function convertVideo(
  inputPath: string,
  outputPath: string,
  format: 'mp4' | 'mkv' | 'flv'
): Promise<{ success: boolean; error?: string }> {
  try {
    // 根据格式选择不同的编码参数
    let codecArgs = '';
    switch (format) {
      case 'mp4':
        codecArgs = '-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k';
        break;
      case 'mkv':
        codecArgs = '-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k';
        break;
      case 'flv':
        codecArgs = '-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k';
        break;
    }

    const command = `ffmpeg -i "${inputPath}" ${codecArgs} -y "${outputPath}"`;
    console.log('执行转换命令:', command);
    
    const { stderr } = await execAsync(command, { 
      timeout: 3600000, // 1小时超时
      maxBuffer: 1024 * 1024 * 100 
    });
    
    console.log('FFmpeg 输出:', stderr);
    return { success: true };
  } catch (error) {
    console.error('转换失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * POST /api/convert
 * 转换视频格式
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inputPath, format, deleteOriginal } = body as {
      inputPath: string;
      format: 'mp4' | 'mkv' | 'flv';
      deleteOriginal?: boolean;
    };

    if (!inputPath || !format) {
      return NextResponse.json(
        { success: false, error: '缺少参数' },
        { status: 400 }
      );
    }

    // 检查 FFmpeg
    const ffmpegVersion = await checkFFmpeg();
    if (!ffmpegVersion) {
      return NextResponse.json(
        { success: false, error: 'FFmpeg 未安装，请先安装 FFmpeg' },
        { status: 400 }
      );
    }

    // 检查输入文件是否存在
    try {
      await fs.access(inputPath);
    } catch {
      return NextResponse.json(
        { success: false, error: '输入文件不存在' },
        { status: 400 }
      );
    }

    // 生成输出路径
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const baseName = path.basename(inputPath, ext);
    const outputPath = path.join(dir, `${baseName}.${format}`);

    // 执行转换
    const result = await convertVideo(inputPath, outputPath, format);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // 删除原文件
    if (deleteOriginal) {
      try {
        await fs.unlink(inputPath);
        console.log('已删除原文件:', inputPath);
      } catch (err) {
        console.error('删除原文件失败:', err);
      }
    }

    // 获取输出文件大小
    const stats = await fs.stat(outputPath);

    return NextResponse.json({
      success: true,
      data: {
        outputPath,
        size: stats.size,
        format,
        ffmpegVersion,
      },
    });
  } catch (error) {
    console.error('转换 API 错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '转换失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/convert
 * 检查转换功能是否可用
 */
export async function GET() {
  const ffmpegVersion = await checkFFmpeg();
  
  return NextResponse.json({
    success: true,
    data: {
      available: !!ffmpegVersion,
      ffmpegVersion,
      platform: os.platform(),
      supportedFormats: ['mp4', 'mkv', 'flv'],
    },
  });
}
