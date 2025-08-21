import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { Users, FileText, Calendar, BarChart3, Shield, LogIn } from "lucide-react";

export default function Index() {
  const { user, profile } = useAuth();

  const features = [
    {
      title: "Gestão de Pacientes",
      description: "Cadastre e gerencie informações completas dos pacientes",
      icon: Users,
      href: "/patients"
    },
    {
      title: "Laudos Médicos", 
      description: "Crie e assine laudos digitalmente com segurança",
      icon: FileText,
      href: "/laudos/editor"
    },
    {
      title: "Agendamentos",
      description: "Controle completo da agenda de consultas",
      icon: Calendar,
      href: "/agendamentos"
    },
    {
      title: "Relatórios",
      description: "Dashboards e relatórios detalhados",
      icon: BarChart3,
      href: "/relatorios"
    }
  ];

  return (
    <>
      <Helmet>
        <title>Clinicare Assist - Sistema de Gestão Clínica</title>
        <meta name="description" content="Sistema completo de gestão para clínicas médicas com controle de pacientes, agendamentos e laudos" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Bem-vindo ao Clinicare Assist
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {user ? (
                <>Olá, <strong>{profile?.full_name || 'Usuário'}</strong>! Gerencie sua clínica de forma eficiente com nosso sistema completo.</>
              ) : (
                "Sistema completo de gestão para clínicas médicas com controle de pacientes, agendamentos e laudos."
              )}
            </p>
            
            {!user && (
              <div className="mt-8">
                <Button asChild size="lg" className="mr-4">
                  <Link to="/auth">
                    <LogIn className="mr-2 h-5 w-5" />
                    Fazer Login
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {user && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => {
                const IconComponent = feature.icon;
                
                return (
                  <Card key={feature.title} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <Link to={feature.href}>
                      <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                          <IconComponent className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-center">
                          {feature.description}
                        </CardDescription>
                      </CardContent>
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}

          {!user && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-60">
              {features.map((feature) => {
                const IconComponent = feature.icon;
                
                return (
                  <Card key={feature.title} className="pointer-events-none">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                        <IconComponent className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}