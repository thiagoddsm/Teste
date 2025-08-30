"use client"

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Upload, Users, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { teams } from "@/lib/data";
import { areasOfService } from "@/lib/data";
import type { Volunteer } from "@/lib/types";

export default function VolunteersPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Carregar voluntários do Firebase
  const loadVolunteers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "volunteers"));
      const volunteersData: Volunteer[] = [];
      querySnapshot.forEach((doc) => {
        volunteersData.push({ id: doc.id, ...doc.data() } as Volunteer);
      });
      setVolunteers(volunteersData);
    } catch (error) {
      console.error("Erro ao carregar voluntários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os voluntários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVolunteers();
  }, []);

  const handleDownloadTemplate = () => {
    // Criar o conteúdo CSV da planilha modelo
    const csvContent = `Nome Completo,Email,Telefone,Equipe,Areas,Disponibilidade,Observacoes
João Silva,joao.silva@email.com,(11) 99999-9999,Alpha,Som;Projeção,Culto da Família;Culto de Propósitos,Disponível para eventos especiais
Maria Santos,maria.santos@email.com,(11) 88888-8888,Bravo,Fotografia;Recepção,Culto da Família;Culto da Noite,Experiência com fotografia`;

    // Criar o blob e fazer o download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao_voluntarios.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download iniciado",
      description: "O modelo de planilha foi baixado com sucesso.",
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo CSV.",
          variant: "destructive",
        });
      }
    }
  };

  const handleImportVolunteers = async () => {
    if (!selectedFile) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo CSV para importar.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Ler o conteúdo do arquivo CSV
      const text = await selectedFile.text();
      const lines = text.split('\n');
      
      if (lines.length < 2) {
        throw new Error('Arquivo CSV deve conter pelo menos um cabeçalho e uma linha de dados.');
      }

      // Processar o cabeçalho
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Validar se o cabeçalho contém os campos obrigatórios
      const requiredFields = ['Nome Completo', 'Email'];
      const missingFields = requiredFields.filter(field => !headers.includes(field));
      
      if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
      }

      // Processar as linhas de dados
      const newVolunteers = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const values = line.split(',').map(v => v.trim());
          const volunteerData: any = {};
          
          headers.forEach((header, index) => {
            volunteerData[header] = values[index] || '';
          });
          
          // Mapear os campos para o formato esperado
          const volunteer: Omit<Volunteer, 'id'> = {
            name: volunteerData['Nome Completo'] || '',
            email: volunteerData['Email'] || '',
            phone: volunteerData['Telefone'] || '',
            team: volunteerData['Equipe'] || 'N/A',
            areas: volunteerData['Areas'] ? volunteerData['Areas'].split(';').map((a: string) => a.trim()) : [],
            availability: volunteerData['Disponibilidade'] ? volunteerData['Disponibilidade'].split(';').map((a: string) => a.trim()) : [],
          };
          
          newVolunteers.push(volunteer);
        }
      }

      // Salvar no Firebase
      let successCount = 0;
      for (const volunteer of newVolunteers) {
        try {
          await addDoc(collection(db, "volunteers"), volunteer);
          successCount++;
        } catch (error) {
          console.error('Erro ao salvar voluntário:', volunteer.name, error);
        }
      }

      toast({
        title: "Importação concluída",
        description: `${successCount} voluntário(s) foram importados com sucesso.`,
      });

      setSelectedFile(null);
      // Reset do input file
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Recarregar a lista de voluntários
      await loadVolunteers();

    } catch (error) {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao importar os voluntários.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteVolunteer = async (volunteerId: string) => {
    try {
      await deleteDoc(doc(db, "volunteers", volunteerId));
      toast({
        title: "Voluntário removido",
        description: "O voluntário foi removido com sucesso.",
      });
      await loadVolunteers();
    } catch (error) {
      console.error('Erro ao remover voluntário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o voluntário.",
        variant: "destructive",
      });
    }
  };

  const handleEditVolunteer = (volunteer: Volunteer) => {
    setEditingVolunteer(volunteer);
    setIsEditDialogOpen(true);
  };

  const handleSaveVolunteer = async () => {
    if (!editingVolunteer) return;

    try {
      const { id, ...volunteerData } = editingVolunteer;
      await updateDoc(doc(db, "volunteers", id), volunteerData);
      toast({
        title: "Voluntário atualizado",
        description: "Os dados do voluntário foram atualizados com sucesso.",
      });
      setIsEditDialogOpen(false);
      setEditingVolunteer(null);
      await loadVolunteers();
    } catch (error) {
      console.error('Erro ao atualizar voluntário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o voluntário.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Voluntários</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card para download do modelo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Baixar Modelo de Planilha
            </CardTitle>
            <CardDescription>
              Baixe o modelo de planilha para importação de voluntários em formato CSV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDownloadTemplate} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Baixar Modelo CSV
            </Button>
          </CardContent>
        </Card>

        {/* Card para importação de voluntários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Voluntários
            </CardTitle>
            <CardDescription>
              Selecione um arquivo CSV com os dados dos voluntários para importar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-input">Arquivo CSV</Label>
              <Input
                id="file-input"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </div>
            
            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                Arquivo selecionado: {selectedFile.name}
              </div>
            )}

            <Button 
              onClick={handleImportVolunteers} 
              className="w-full"
              disabled={!selectedFile || isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Importando...' : 'Importar Voluntários'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Instruções de uso */}
      <Card>
        <CardHeader>
          <CardTitle>Instruções de Uso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Como usar a importação:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Baixe o modelo de planilha CSV clicando no botão "Baixar Modelo CSV"</li>
              <li>Abra o arquivo no Excel, Google Sheets ou outro editor de planilhas</li>
              <li>Preencha os dados dos voluntários seguindo o formato do exemplo</li>
              <li>Salve o arquivo em formato CSV</li>
              <li>Use o botão "Importar Voluntários" para fazer o upload do arquivo</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Campos obrigatórios:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Nome Completo:</strong> Nome completo do voluntário</li>
              <li><strong>Email:</strong> Endereço de email válido</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Campos opcionais:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Telefone, Data de Nascimento, Gênero</li>
              <li>Endereço, Cidade, Estado, CEP</li>
              <li>Habilidades (separadas por ponto e vírgula)</li>
              <li>Disponibilidade, Observações</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Voluntários</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card para download do modelo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Baixar Modelo de Planilha
            </CardTitle>
            <CardDescription>
              Baixe o modelo de planilha para importação de voluntários em formato CSV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDownloadTemplate} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Baixar Modelo CSV
            </Button>
          </CardContent>
        </Card>

        {/* Card para importação de voluntários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Voluntários
            </CardTitle>
            <CardDescription>
              Selecione um arquivo CSV com os dados dos voluntários para importar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-input">Arquivo CSV</Label>
              <Input
                id="file-input"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </div>
            
            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                Arquivo selecionado: {selectedFile.name}
              </div>
            )}

            <Button 
              onClick={handleImportVolunteers} 
              className="w-full"
              disabled={!selectedFile || isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Importando...' : 'Importar Voluntários'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lista de voluntários */}
      <Card>
        <CardHeader>
          <CardTitle>Voluntários Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os voluntários cadastrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="ml-2 text-muted-foreground">Carregando voluntários...</span>
            </div>
          ) : volunteers.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              Nenhum voluntário cadastrado ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Áreas</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {volunteers.map((volunteer) => (
                  <TableRow key={volunteer.id}>
                    <TableCell className="font-medium">{volunteer.name}</TableCell>
                    <TableCell>{volunteer.email}</TableCell>
                    <TableCell>{volunteer.phone}</TableCell>
                    <TableCell>{volunteer.team}</TableCell>
                    <TableCell>{volunteer.areas.join(', ')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditVolunteer(volunteer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteVolunteer(volunteer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para edição de voluntário */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Voluntário</DialogTitle>
            <DialogDescription>
              Edite as informações do voluntário.
            </DialogDescription>
          </DialogHeader>
          
          {editingVolunteer && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome Completo</Label>
                  <Input
                    id="edit-name"
                    value={editingVolunteer.name}
                    onChange={(e) => setEditingVolunteer({
                      ...editingVolunteer,
                      name: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingVolunteer.email}
                    onChange={(e) => setEditingVolunteer({
                      ...editingVolunteer,
                      email: e.target.value
                    })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={editingVolunteer.phone}
                    onChange={(e) => setEditingVolunteer({
                      ...editingVolunteer,
                      phone: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-team">Equipe</Label>
                  <Select
                    value={editingVolunteer.team}
                    onValueChange={(value) => setEditingVolunteer({
                      ...editingVolunteer,
                      team: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N/A">N/A</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.name} value={team.name}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Áreas de Serviço</Label>
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {areasOfService.map((area) => (
                    <div key={area.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={`area-${area.name}`}
                        checked={editingVolunteer.areas.includes(area.name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditingVolunteer({
                              ...editingVolunteer,
                              areas: [...editingVolunteer.areas, area.name]
                            });
                          } else {
                            setEditingVolunteer({
                              ...editingVolunteer,
                              areas: editingVolunteer.areas.filter(a => a !== area.name)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`area-${area.name}`} className="text-sm">
                        {area.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-availability">Disponibilidade</Label>
                <Textarea
                  id="edit-availability"
                  placeholder="Ex: Culto da Família, Culto de Propósitos"
                  value={editingVolunteer.availability.join(', ')}
                  onChange={(e) => setEditingVolunteer({
                    ...editingVolunteer,
                    availability: e.target.value.split(',').map(a => a.trim()).filter(a => a)
                  })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveVolunteer}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Instruções de uso */}
      <Card>
        <CardHeader>
          <CardTitle>Instruções de Uso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Como usar a importação:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Baixe o modelo de planilha CSV clicando no botão "Baixar Modelo CSV"</li>
              <li>Abra o arquivo no Excel, Google Sheets ou outro editor de planilhas</li>
              <li>Preencha os dados dos voluntários seguindo o formato do exemplo</li>
              <li>Salve o arquivo em formato CSV</li>
              <li>Use o botão "Importar Voluntários" para fazer o upload do arquivo</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Campos obrigatórios:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Nome Completo:</strong> Nome completo do voluntário</li>
              <li><strong>Email:</strong> Endereço de email válido</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Campos opcionais:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Telefone:</strong> Número de telefone do voluntário</li>
              <li><strong>Equipe:</strong> Equipe à qual o voluntário pertence (Alpha, Bravo, Charlie, Delta)</li>
              <li><strong>Areas:</strong> Áreas de serviço (separadas por ponto e vírgula)</li>
              <li><strong>Disponibilidade:</strong> Horários disponíveis (separados por ponto e vírgula)</li>
              <li><strong>Observacoes:</strong> Observações adicionais sobre o voluntário</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

