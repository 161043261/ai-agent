import * as fs from 'fs/promises';
import * as path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import { BaseTool, ToolParameter } from './tool.interface';

const PDF_DIR = process.cwd() + '/tmp/pdf';

// 项目自带字体（优先）+ 系统字体（备选）
const FONT_PATHS = [
  // 项目自带字体
  path.join(process.cwd(), 'resources', 'SarasaGothicSC-Regular.ttf'),
];

/**
 * PDF 生成工具（支持中文）
 */
export class PDFGenerationTool extends BaseTool {
  name = 'generatePDF';
  description = 'Generate a PDF file with given content (supports Chinese)';
  parameters: ToolParameter[] = [
    {
      name: 'fileName',
      type: 'string',
      description: 'Name of the file to save the generated PDF',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'Content to be included in the PDF',
      required: true,
    },
  ];

  /**
   * 查找可用的中文字体
   */
  private async findChineseFont(): Promise<Buffer | null> {
    for (const fontPath of FONT_PATHS) {
      try {
        const fontBytes = await fs.readFile(fontPath);
        return fontBytes;
      } catch {
        // 字体不存在，继续尝试下一个
      }
    }
    return null;
  }

  async execute(args: Record<string, unknown>): Promise<string> {
    const fileName = args.fileName as string;
    const content = args.content as string;
    const filePath = path.join(PDF_DIR, fileName);

    try {
      // 创建目录
      await fs.mkdir(PDF_DIR, { recursive: true });

      // 创建 PDF 文档
      const pdfDoc = await PDFDocument.create();

      // 注册 fontkit 以支持自定义字体
      pdfDoc.registerFontkit(fontkit);

      // 查找并嵌入中文字体
      const fontBytes = await this.findChineseFont();
      if (!fontBytes) {
        return 'Error: No Chinese font found on this system. Please install a Chinese font.';
      }

      const font = await pdfDoc.embedFont(fontBytes, { subset: true });

      // 添加页面
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const fontSize = 12;
      const margin = 50;
      const lineHeight = fontSize * 1.8;
      const maxWidth = width - margin * 2;

      // 按行分割内容（支持换行符和自动换行）
      const paragraphs = content.split(/\n/);
      const lines: string[] = [];

      for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') {
          lines.push('');
          continue;
        }

        // 逐字符计算宽度实现自动换行
        let currentLine = '';
        for (const char of paragraph) {
          const testLine = currentLine + char;
          const textWidth = font.widthOfTextAtSize(testLine, fontSize);

          if (textWidth < maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = char;
          }
        }
        if (currentLine) lines.push(currentLine);
      }

      // 绘制文本
      let y = height - margin;
      for (const line of lines) {
        if (y < margin) {
          // 添加新页面
          page = pdfDoc.addPage();
          y = page.getSize().height - margin;
        }

        if (line.trim()) {
          page.drawText(line, {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
        }
        y -= lineHeight;
      }

      // 保存 PDF
      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(filePath, pdfBytes);

      return `PDF generated successfully to: ${filePath}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error generating PDF: ${errorMessage}`;
    }
  }
}
