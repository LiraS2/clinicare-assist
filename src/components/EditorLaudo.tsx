import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  User,
  Calendar,
  CreditCard
} from "lucide-react"

interface PatientData {
  nome: string
  idade: number
  cpf: string
}

interface EditorLaudoProps {
  patientData: PatientData
  initialContent?: string
  onContentChange?: (content: string) => void
}

export function EditorLaudo({ patientData, initialContent = '', onContentChange }: EditorLaudoProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      onContentChange?.(JSON.stringify(json))
    },
  })

  if (!editor) {
    return null
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children 
  }: { 
    onClick: () => void
    isActive?: boolean
    children: React.ReactNode 
  }) => (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  )

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Cabeçalho fixo com dados do paciente */}
      <Card className="rounded-none border-x-0 border-t-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-6">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Paciente:</span>
              <span className="text-sm text-foreground">{patientData.nome}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Idade:</span>
              <span className="text-sm text-foreground">{patientData.idade} anos</span>
            </div>
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">CPF:</span>
              <span className="text-sm text-foreground">{patientData.cpf}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Barra de ferramentas de formatação */}
      <Card className="rounded-none border-x-0 border-b shadow-sm">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-1">
            {/* Formatação básica */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
            >
              <UnderlineIcon className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Listas */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Alinhamento */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
            >
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
            >
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
            >
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </CardContent>
      </Card>

      {/* Área principal de edição */}
      <div className="flex-1 overflow-hidden">
        <Card className="h-full rounded-none border-x-0 border-b-0">
          <CardContent className="h-full p-6">
            <div className="h-full">
              <EditorContent 
                editor={editor} 
                className="h-full prose prose-slate max-w-none focus:outline-none prose-p:my-2 prose-headings:my-3"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}