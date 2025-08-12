import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Helmet>
        <title>MediConnect | Gestão de Clínicas</title>
        <meta name="description" content="MediConnect - Gestão de pacientes para reduzir o absenteísmo." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/'} />
      </Helmet>
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">MediConnect</h1>
        <p className="text-lg text-muted-foreground">Reduza o absenteísmo com uma gestão moderna de pacientes.</p>
        <a href="/patients">
          <Button>Ir para Pacientes</Button>
        </a>
      </div>
    </div>
  );
};

export default Index;
