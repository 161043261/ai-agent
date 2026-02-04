package com.github.tianchenghang.tools;

import cn.hutool.core.io.FileUtil;
import com.github.tianchenghang.constants.FileConstant;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import java.io.IOException;
import java.nio.file.Paths;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

/** pdf generate tool. */
public class PdfGenerateTool {

  @Tool(description = "Generate a pdf file with content", returnDirect = false)
  public String generatePDF(
      @ToolParam(description = "Generated pdf filename") String filename,
      @ToolParam(description = "Content to be written to the pdf") String content) {
    var fileDir = FileConstant.FILE_OUTPUT_DIR + "/pdf";
    var filepath = fileDir + "/" + filename;
    try {
      // Create directory
      FileUtil.mkdir(fileDir);
      // Create PdfWriter and PdfDocument objects
      try (var writer = new PdfWriter(filepath);
          var pdf = new PdfDocument(writer);
          var document = new Document(pdf)) {
        // Custom font
        var fontPath =
            Paths.get("src/main/resources/SarasaGothicSC-Regular.ttf").toAbsolutePath().toString();
        var font =
            PdfFontFactory.createFont(fontPath, PdfFontFactory.EmbeddingStrategy.PREFER_EMBEDDED);
        document.setFont(font);
        // Create paragraph
        var paragraph = new Paragraph(content);
        // Add paragraph and close document
        document.add(paragraph);
      }
      return "Pdf generated successfully to: " + filepath;
    } catch (IOException e) {
      return "Error generating pdf: " + e.getMessage();
    }
  }
}
