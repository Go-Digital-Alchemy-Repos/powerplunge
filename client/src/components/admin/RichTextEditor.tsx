import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback, useState, useRef } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code, Link as LinkIcon, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3,
  Undo, Redo, RemoveFormatting, Minus, Upload, FolderOpen,
  Loader2, ClipboardPaste,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpload } from "@/hooks/use-upload";
import { useToast } from "@/hooks/use-toast";
import { MediaPickerDialog } from "@/components/admin/MediaPickerDialog";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors",
        active
          ? "bg-primary/20 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-0.5" />;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content...",
  className,
  "data-testid": testId,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      ImageExtension.configure({
        HTMLAttributes: { class: "max-w-full rounded-lg" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "tiptap prose prose-invert prose-sm max-w-none min-h-[200px] p-3 focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload();
  const { toast } = useToast();

  const insertImage = useCallback((url: string) => {
    if (!editor || !url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file);
    if (result) {
      const publicUrl = (result.metadata as any)?.publicUrl || result.objectPath;

      await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          storagePath: result.objectPath,
          publicUrl,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          folder: "uploads",
        }),
        credentials: "include",
      });

      insertImage(publicUrl);
      setShowImageDialog(false);
      toast({ title: "Image uploaded and inserted" });
    }
    e.target.value = "";
  }, [uploadFile, insertImage, toast]);

  const handleMediaSelect = useCallback((url: string) => {
    insertImage(url);
    setShowMediaPicker(false);
    setShowImageDialog(false);
  }, [insertImage]);

  const handleUrlInsert = useCallback(() => {
    if (imageUrlInput.trim()) {
      insertImage(imageUrlInput.trim());
      setImageUrlInput("");
      setShowImageDialog(false);
    }
  }, [imageUrlInput, insertImage]);

  const handlePasteFromClipboard = useCallback(async () => {
    if (!editor) return;
    try {
      const clipboardItems = await navigator.clipboard.read();
      let htmlContent = "";
      let plainText = "";

      for (const item of clipboardItems) {
        if (item.types.includes("text/html")) {
          const blob = await item.getType("text/html");
          htmlContent = await blob.text();
        }
        if (item.types.includes("text/plain")) {
          const blob = await item.getType("text/plain");
          plainText = await blob.text();
        }
      }

      if (htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");

        const metaTags = doc.querySelectorAll("meta, style, title, script, link");
        metaTags.forEach(el => el.remove());

        const cleanHtml = doc.body.innerHTML;

        editor.chain().focus().insertContent(cleanHtml, {
          parseOptions: { preserveWhitespace: false },
        }).run();

        toast({ title: "Content pasted with formatting preserved" });
      } else if (plainText) {
        const lines = plainText.split("\n");
        let html = "";
        let inList = false;
        let listType = "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            if (inList) {
              html += listType === "ol" ? "</ol>" : "</ul>";
              inList = false;
              listType = "";
            }
            continue;
          }

          const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
          const bulletMatch = trimmed.match(/^[-•*]\s+(.+)$/);

          if (orderedMatch) {
            if (!inList || listType !== "ol") {
              if (inList) html += listType === "ol" ? "</ol>" : "</ul>";
              html += "<ol>";
              inList = true;
              listType = "ol";
            }
            html += `<li>${orderedMatch[2]}</li>`;
          } else if (bulletMatch) {
            if (!inList || listType !== "ul") {
              if (inList) html += listType === "ol" ? "</ol>" : "</ul>";
              html += "<ul>";
              inList = true;
              listType = "ul";
            }
            html += `<li>${bulletMatch[1]}</li>`;
          } else {
            if (inList) {
              html += listType === "ol" ? "</ol>" : "</ul>";
              inList = false;
              listType = "";
            }
            html += `<p>${trimmed}</p>`;
          }
        }
        if (inList) {
          html += listType === "ol" ? "</ol>" : "</ul>";
        }

        editor.chain().focus().insertContent(html, {
          parseOptions: { preserveWhitespace: false },
        }).run();

        toast({ title: "Content pasted with formatting preserved" });
      }
    } catch (err: any) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          const lines = text.split("\n");
          let html = "";
          let inList = false;
          let listType = "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              if (inList) {
                html += listType === "ol" ? "</ol>" : "</ul>";
                inList = false;
                listType = "";
              }
              continue;
            }

            const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
            const bulletMatch = trimmed.match(/^[-•*]\s+(.+)$/);

            if (orderedMatch) {
              if (!inList || listType !== "ol") {
                if (inList) html += listType === "ol" ? "</ol>" : "</ul>";
                html += "<ol>";
                inList = true;
                listType = "ol";
              }
              html += `<li>${orderedMatch[2]}</li>`;
            } else if (bulletMatch) {
              if (!inList || listType !== "ul") {
                if (inList) html += listType === "ol" ? "</ol>" : "</ul>";
                html += "<ul>";
                inList = true;
                listType = "ul";
              }
              html += `<li>${bulletMatch[1]}</li>`;
            } else {
              if (inList) {
                html += listType === "ol" ? "</ol>" : "</ul>";
                inList = false;
                listType = "";
              }
              html += `<p>${trimmed}</p>`;
            }
          }
          if (inList) {
            html += listType === "ol" ? "</ol>" : "</ul>";
          }

          editor.chain().focus().insertContent(html, {
            parseOptions: { preserveWhitespace: false },
          }).run();

          toast({ title: "Content pasted with formatting preserved" });
        }
      } catch {
        toast({ title: "Unable to access clipboard", description: "Please use Ctrl+V / Cmd+V to paste, or allow clipboard permissions in your browser.", variant: "destructive" });
      }
    }
  }, [editor, toast]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "border border-border rounded-md bg-muted overflow-hidden mt-1",
        className
      )}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/80">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={addLink} active={editor.isActive("link")} title="Link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => setShowImageDialog(true)} title="Image">
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={handlePasteFromClipboard}
          title="Paste from Clipboard (preserves formatting)"
        >
          <ClipboardPaste className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Clear Formatting"
        >
          <RemoveFormatting className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        data-testid="rte-image-file-input"
      />

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              Insert Image
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="rte-image-upload-btn"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
              ) : (
                <Upload className="w-5 h-5 text-primary flex-shrink-0" />
              )}
              <div className="text-left">
                <p className="text-sm font-medium">{isUploading ? "Uploading..." : "Upload Image"}</p>
                <p className="text-xs text-muted-foreground">Choose a file from your computer</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={() => { setShowMediaPicker(true); setShowImageDialog(false); }}
              data-testid="rte-image-library-btn"
            >
              <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium">Media Library</p>
                <p className="text-xs text-muted-foreground">Select from uploaded images</p>
              </div>
            </Button>

            <div className="relative pt-2">
              <div className="absolute inset-0 flex items-center pt-2">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center pt-2">
                <span className="bg-popover px-2 text-xs text-muted-foreground">or paste a URL</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUrlInsert(); }}
                placeholder="https://example.com/image.jpg"
                data-testid="rte-image-url-input"
              />
              <Button
                onClick={handleUrlInsert}
                disabled={!imageUrlInput.trim()}
                size="sm"
                className="px-4"
                data-testid="rte-image-url-insert"
              >
                Insert
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MediaPickerDialog
        open={showMediaPicker}
        onOpenChange={setShowMediaPicker}
        onSelect={handleMediaSelect}
        accept="image/*"
        title="Select Image"
      />
    </div>
  );
}
