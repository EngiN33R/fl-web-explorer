import { DOMParser } from "xmldom";
import { JSDOM } from "jsdom";

/**
 * Text formatting attributes
 */
interface TextAttributes {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
}

/**
 * Creates an XML string for a TRA element with the given attributes
 */
function createTraElement(attrs: TextAttributes): string {
  const attrStrings: string[] = [];

  if (attrs.bold !== undefined) {
    attrStrings.push(`bold="${attrs.bold}"`);
  }

  if (attrs.italic !== undefined) {
    attrStrings.push(`italic="${attrs.italic}"`);
  }

  if (attrs.underline !== undefined) {
    attrStrings.push(`underline="${attrs.underline}"`);
  }

  if (attrs.color !== undefined) {
    attrStrings.push(`color="${attrs.color}"`);
  }

  return `<TRA ${attrStrings.join(" ")}/>`;
}

/**
 * Gets the CSS style string from text attributes
 */
function getStyleFromAttributes(attrs: TextAttributes): string {
  const styles: string[] = [];

  if (attrs.bold) {
    styles.push("font-weight: bold");
  }

  if (attrs.italic) {
    styles.push("font-style: italic");
  }

  if (attrs.underline) {
    styles.push("text-decoration: underline");
  }

  if (attrs.color) {
    styles.push(`color: ${attrs.color}`);
  }

  return styles.join("; ");
}

/**
 * Converts XML in RDL format to HTML
 */
export class XmlToHtmlConverter {
  private attributeStack: TextAttributes[] = [
    { bold: false, italic: false, underline: false, color: "default" },
  ];
  private result: string = "";

  /**
   * Converts XML string to HTML
   * @param xmlString The XML string in RDL format
   * @returns HTML representation of the XML content
   */
  public convert(xmlString: string): string {
    // Reset state
    this.result = "";
    this.attributeStack = [
      { bold: false, italic: false, underline: false, color: "default" },
    ];

    try {
      // Parse XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");

      // Process RDL element
      if (xmlDoc.documentElement.nodeName === "RDL") {
        this.processChildNodes(xmlDoc.documentElement.childNodes);
      } else {
        throw new Error("Root element must be RDL");
      }

      return this.result.trim();
    } catch (error: any) {
      throw new Error(`Failed to parse XML: ${error.message} (${xmlString})`);
    }
  }

  /**
   * Gets the current text attributes from the stack
   */
  private get currentAttributes(): TextAttributes {
    return this.attributeStack[this.attributeStack.length - 1];
  }

  /**
   * Processes all child nodes in order
   * @param nodeList List of child nodes to process
   */
  private processChildNodes(nodeList: NodeListOf<ChildNode>): void {
    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i];

      if (node.nodeType !== 1) {
        // Not an element node
        continue;
      }

      const element = node as Element;
      const tagName = element.nodeName;

      switch (tagName) {
        case "PUSH":
          this.attributeStack.push({ ...this.currentAttributes });
          break;

        case "POP":
          if (this.attributeStack.length > 1) {
            this.attributeStack.pop();
          }
          break;

        case "TRA":
          this.updateAttributes(element);
          break;

        case "TEXT":
          this.appendFormattedText(element.textContent || "");
          break;

        case "PARA":
          this.result += "<br>";
          break;
      }
    }
  }

  /**
   * Updates the current text attributes based on TRA element attributes
   * @param element The TRA element with text attributes
   */
  private updateAttributes(element: Element): void {
    const current = { ...this.currentAttributes };

    if (element.hasAttribute("bold")) {
      current.bold = element.getAttribute("bold") === "true";
    }

    if (element.hasAttribute("italic")) {
      current.italic = element.getAttribute("italic") === "true";
    }

    if (element.hasAttribute("underline")) {
      current.underline = element.getAttribute("underline") === "true";
    }

    if (element.hasAttribute("color")) {
      current.color = element.getAttribute("color") || "default";
      current.color = current.color === "default" ? "inherit" : current.color;
    }

    this.attributeStack[this.attributeStack.length - 1] = current;
  }

  /**
   * Appends formatted text to the result
   * @param text The text content to format
   */
  private appendFormattedText(text: string): void {
    const attributes = this.currentAttributes;
    const styleString = getStyleFromAttributes(attributes);

    if (styleString) {
      this.result += `<span style="${styleString}">${text}</span>`;
    } else {
      this.result += text;
    }
  }
}

/**
 * Converts XML in RDL format to HTML
 * @param xmlString The XML string in RDL format
 * @returns HTML representation of the XML content
 */
export function convertXmlToHtml(xmlString: string): string {
  if (!xmlString.toLowerCase().includes("<rdl>")) {
    return xmlString;
  }
  const converter = new XmlToHtmlConverter();
  return converter.convert(xmlString);
}

/**
 * Converts HTML to XML in RDL format
 */
export class HtmlToXmlConverter {
  private result: string = "";
  private currentAttributes: TextAttributes = {
    bold: false,
    italic: false,
    underline: false,
    color: "default",
  };

  /**
   * Converts HTML string to RDL XML format
   * @param htmlString The HTML string to convert
   * @returns XML representation in RDL format
   */
  public convert(htmlString: string): string {
    // Reset state
    this.result = "<RDL><PUSH/>";
    this.currentAttributes = {
      bold: false,
      italic: false,
      underline: false,
      color: "default",
    };

    try {
      // Parse HTML
      const dom = new JSDOM(htmlString);
      const document = dom.window.document;
      const body = document.body;

      // Process body nodes
      this.processNodes(body.childNodes);

      // Close the RDL structure
      this.result += "<POP/></RDL>";

      return this.result;
    } catch (error: any) {
      throw new Error(`Failed to parse HTML: ${error.message}`);
    }
  }

  /**
   * Process HTML nodes
   * @param nodeList List of nodes to process
   */
  private processNodes(nodeList: NodeListOf<ChildNode>): void {
    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i];

      if (node.nodeType === 3) {
        // Text node
        // Only process non-empty text
        const text = node.textContent?.trim();
        if (text) {
          this.appendText(text);
        }
      } else if (node.nodeType === 1) {
        // Element node
        const element = node as Element;

        if (element.tagName === "BR") {
          // Add paragraph break
          this.result += "<PARA/>";
        } else if (element.tagName === "SPAN") {
          // Process span with style
          this.processSpan(element);
        } else {
          // Process other elements recursively
          this.processNodes(element.childNodes);
        }
      }
    }
  }

  /**
   * Process a span element
   * @param element The span element to process
   */
  private processSpan(element: Element): void {
    const style = element.getAttribute("style") || "";
    const newAttributes: TextAttributes = { ...this.currentAttributes };

    // Parse style for formatting
    if (style.includes("font-weight: bold")) {
      newAttributes.bold = true;
    }

    if (style.includes("font-style: italic")) {
      newAttributes.italic = true;
    }

    if (style.includes("text-decoration: underline")) {
      newAttributes.underline = true;
    }

    if (style.includes("color: ")) {
      newAttributes.color =
        style.match(/color: (#[0-9a-fA-F]{6})/)?.[1] ?? "default";
    }

    // If attributes changed, update TRA
    if (this.attributesChanged(newAttributes)) {
      this.currentAttributes = { ...newAttributes };
      this.result += createTraElement(this.currentAttributes);
    }

    // Process the text content
    const text = element.textContent?.trim();
    if (text) {
      this.appendText(text);
    }

    // Reset attributes after span if they changed
    if (this.attributesChanged(newAttributes)) {
      // Revert to normal text
      this.currentAttributes = {
        bold: false,
        italic: false,
        underline: false,
        color: "default",
      };
      this.result += createTraElement(this.currentAttributes);
    }
  }

  /**
   * Check if attributes changed from current state
   */
  private attributesChanged(newAttrs: TextAttributes): boolean {
    return (
      newAttrs.bold !== this.currentAttributes.bold ||
      newAttrs.italic !== this.currentAttributes.italic ||
      newAttrs.underline !== this.currentAttributes.underline
    );
  }

  /**
   * Appends text with current formatting
   * @param text The text to append
   */
  private appendText(text: string): void {
    this.result += `<TEXT>${text}</TEXT>`;
  }
}

/**
 * Converts HTML to XML in RDL format
 * @param htmlString The HTML string to convert
 * @returns XML representation in RDL format
 */
export function convertHtmlToXml(htmlString: string): string {
  const converter = new HtmlToXmlConverter();
  return converter.convert(htmlString);
}
