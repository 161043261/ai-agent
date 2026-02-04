import { join } from 'path';
import { BaseTool, ToolParameter } from './types';
import ensureDir from './ensure-dir';
import PDFDocument from 'pdfkit';
import { createWriteStream, existsSync } from 'fs';

const OUTPUT_DIR = process.cwd() + '/tmp/pdf';
const FONT_PATH = process.cwd() + './SarasaGothicSC-Regular.ttf';

export class PdfGenerateTool extends BaseTool {
  name = PdfGenerateTool.name;
  description = 'Generate a pdf file with content';
  parameters: ToolParameter[] = [
    {
      name: 'filename',
      type: 'string',
      description: 'Generated pdf filename',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'Content to be written to the pdf',
      required: true,
    },
  ];

  async execute(args: { filename: string; content: string }): Promise<string> {
    const { filename, content } = args;
    const filepath = join(OUTPUT_DIR, filename);
    try {
      if (!existsSync(FONT_PATH)) {
        return `${FONT_PATH} not found`;
      }
      await ensureDir(OUTPUT_DIR);

      const doc = new PDFDocument({
        size: 'A4',
        bufferPages: true,
      });

      const writeStream = createWriteStream(filepath);

      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          resolve(`Pdf generated successfully to: ${filepath}`);
        });

        writeStream.on('error', (error: Error) => {
          reject(error);
        });
        doc.pipe(writeStream);

        doc.font(FONT_PATH).text(content).end();
      });
    } catch (err) {
      this.logger.error('Generating pdf error:', err);
      return 'Generating pdf error';
    }
  }
}
