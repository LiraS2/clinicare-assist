import { useState } from "react"
import { Helmet } from "react-helmet-async"
import { EditorLaudo } from "@/components/EditorLaudo"

// Mock data - replace with real data from API
const mockPatientData = {
  nome: "Maria Silva Santos",
  idade: 45,
  cpf: "123.456.789-00"
}

export default function EditorLaudoPage() {
  const [content, setContent] = useState<string>('')

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    // Here you would typically save to your backend
    console.log('Content updated:', newContent)
  }

  return (
    <>
      <Helmet>
        <title>Editor de Laudo - Clinicare Assist</title>
        <meta name="description" content="Editor de laudos médicos com formatação avançada" />
      </Helmet>
      
      <EditorLaudo 
        patientData={mockPatientData}
        initialContent={content}
        onContentChange={handleContentChange}
      />
    </>
  )
}