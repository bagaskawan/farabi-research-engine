"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Using built-in Helvetica font family
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.6,
    color: "#1a1a1a",
  },
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    marginBottom: 16,
    color: "#111",
  },
  titleDivider: {
    borderBottomWidth: 2,
    borderBottomColor: "#333",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#222",
  },
  subSectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 8,
    color: "#333",
  },
  paragraph: {
    marginBottom: 10,
    textAlign: "justify",
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 6,
    paddingLeft: 10,
  },
  listNumber: {
    width: 20,
    fontFamily: "Helvetica-Bold",
  },
  listText: {
    flex: 1,
  },
  nestedContent: {
    paddingLeft: 20,
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#888",
  },
});

interface Block {
  type: string;
  props?: { level?: number };
  content?: Array<{
    type: string;
    text?: string;
    styles?: Record<string, boolean>;
  }>;
  children?: Block[];
}

interface PdfExportDocumentProps {
  title: string;
  blocks: Block[];
}

// Helper to strip emojis and icons from text
function stripEmojis(text: string): string {
  // Remove common emoji ranges and icon characters
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "") // Emojis
    .replace(/[\u{2600}-\u{26FF}]/gu, "") // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, "") // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "") // Variation selectors
    .replace(/[\u{1F000}-\u{1F02F}]/gu, "") // Mahjong
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, "") // Playing cards
    .trim();
}

// Helper to extract text from block content
function extractText(content: Block["content"]): string {
  if (!content || !Array.isArray(content)) return "";
  return content.map((item) => stripEmojis(item.text || "")).join("");
}

// Render content with styles (strips emojis)
function RenderContent({ content }: { content: Block["content"] }) {
  if (!content || !Array.isArray(content)) return null;

  return (
    <>
      {content.map((item, idx) => {
        const isBold = item.styles?.bold;
        const isItalic = item.styles?.italic;
        const isCode = item.styles?.code;

        // Strip emojis from text
        const cleanText = stripEmojis(item.text || "");
        if (!cleanText) return null;

        const style: Record<string, any> = {};
        if (isBold) style.fontFamily = "Helvetica-Bold";
        if (isItalic) style.fontFamily = "Helvetica-Oblique";
        if (isBold && isItalic) style.fontFamily = "Helvetica-BoldOblique";
        if (isCode) {
          style.fontFamily = "Courier";
          style.backgroundColor = "#f5f5f5";
          style.fontSize = 10;
        }

        return (
          <Text key={idx} style={style}>
            {cleanText}
          </Text>
        );
      })}
    </>
  );
}

// Recursive function to render blocks including nested children
function RenderBlocks({
  blocks,
  listCounter,
  setListCounter,
  titleToSkip,
}: {
  blocks: Block[];
  listCounter: { current: number };
  setListCounter: (n: number) => void;
  titleToSkip?: string;
}) {
  return (
    <>
      {blocks.map((block, index) => {
        // Reset list counter for non-list items
        if (block.type !== "numberedListItem") {
          listCounter.current = 0;
        }

        // Get text content for comparison
        const blockText = extractText(block.content);

        // Skip first H1 heading if it matches the project title (to avoid duplicate)
        if (
          block.type === "heading" &&
          block.props?.level === 1 &&
          titleToSkip &&
          blockText
            .toLowerCase()
            .includes(titleToSkip.toLowerCase().substring(0, 20))
        ) {
          return null;
        }

        switch (block.type) {
          case "heading": {
            const level = block.props?.level || 1;
            const headingStyle =
              level === 1
                ? styles.title
                : level === 2
                ? styles.sectionTitle
                : styles.subSectionTitle;
            return (
              <View key={index}>
                <Text style={headingStyle}>
                  <RenderContent content={block.content} />
                </Text>
                {/* Render nested children (tabs/columns under headings) */}
                {block.children && block.children.length > 0 && (
                  <View style={styles.nestedContent}>
                    <RenderBlocks
                      blocks={block.children}
                      listCounter={listCounter}
                      setListCounter={setListCounter}
                    />
                  </View>
                )}
              </View>
            );
          }

          case "paragraph": {
            if (!blockText.trim()) return null;
            return (
              <View key={index}>
                <Text style={styles.paragraph}>
                  <RenderContent content={block.content} />
                </Text>
                {/* Render nested children (tabs/columns) */}
                {block.children && block.children.length > 0 && (
                  <View style={styles.nestedContent}>
                    <RenderBlocks
                      blocks={block.children}
                      listCounter={listCounter}
                      setListCounter={setListCounter}
                    />
                  </View>
                )}
              </View>
            );
          }

          case "numberedListItem": {
            listCounter.current++;
            return (
              <View key={index}>
                <View style={styles.listItem}>
                  <Text style={styles.listNumber}>{listCounter.current}.</Text>
                  <Text style={styles.listText}>
                    <RenderContent content={block.content} />
                  </Text>
                </View>
                {/* Render nested children */}
                {block.children && block.children.length > 0 && (
                  <View style={styles.nestedContent}>
                    <RenderBlocks
                      blocks={block.children}
                      listCounter={listCounter}
                      setListCounter={setListCounter}
                    />
                  </View>
                )}
              </View>
            );
          }

          case "bulletListItem": {
            return (
              <View key={index}>
                <View style={styles.listItem}>
                  <Text style={styles.listNumber}>•</Text>
                  <Text style={styles.listText}>
                    <RenderContent content={block.content} />
                  </Text>
                </View>
                {/* Render nested children */}
                {block.children && block.children.length > 0 && (
                  <View style={styles.nestedContent}>
                    <RenderBlocks
                      blocks={block.children}
                      listCounter={listCounter}
                      setListCounter={setListCounter}
                    />
                  </View>
                )}
              </View>
            );
          }

          default:
            // For any unknown block types, try to render children if they exist
            if (block.children && block.children.length > 0) {
              return (
                <View key={index} style={styles.nestedContent}>
                  <RenderBlocks
                    blocks={block.children}
                    listCounter={listCounter}
                    setListCounter={setListCounter}
                  />
                </View>
              );
            }
            return null;
        }
      })}
    </>
  );
}

export function PdfExportDocument({ title, blocks }: PdfExportDocumentProps) {
  const listCounter = { current: 0 };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Project Title from props (not from blocks) */}
        <Text style={styles.title}>{stripEmojis(title)}</Text>
        <View style={styles.titleDivider} />

        {/* Content Blocks */}
        <RenderBlocks
          blocks={blocks}
          listCounter={listCounter}
          setListCounter={(n) => (listCounter.current = n)}
          titleToSkip={title}
        />

        {/* Footer */}
        <Text style={styles.footer}>Generated by Farabi Research Engine</Text>
      </Page>
    </Document>
  );
}
