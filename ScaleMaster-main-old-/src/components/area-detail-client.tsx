"use client"

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, ChevronLeft, MoreHorizontal, Edit } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { AreaOfService, Volunteer } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppData } from '@/context/AppDataContext';

const volunteerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  team: z.string().min(1, "Equipe é obrigatória"),
  areas: z.array(z.string()).min(1, "Selecione ao menos uma área"),
  availability: z.array(z.string()),
  phone: z.string().optional(),
  email: z.string().email({ message: "Email inválido" }).optional().or(z.literal('')),
});


export default function AreaDetailClient({ area }: { area: AreaOfService }) {
  const { toast } = useToast();
  const { volunteers, teams, areasOfService, events, updateVolunteer } = useAppData();
  
  // Dialog states
  const [isAddVolunteeerDialogOpen, setIsAddVolunteeerDialogOpen] = useState(false);
  const [isRemoveVolunteeerDialogOpen, setIsRemoveVolunteeerDialogOpen] = useState(false);
  const [isEditVolunteerDialogOpen, setIsEditVolunteerDialogOpen] = useState(false);
  
  // Selection states
  const [volunteerToRemove, setVolunteerToRemove] = useState<Volunteer | null>(null);
  const [volunteerToEdit, setVolunteerToEdit] = useState<Volunteer | null>(null);
  const [volunteerToAdd, setVolunteerToAdd] = useState('');
  
  const form = useForm<z.infer<typeof volunteerSchema>>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: { name: '', team: '', areas: [], availability: [], phone: '', email: '' },
  });

  const availabilityItems = useMemo(() => Array.from(new Set(events.map(e => e.name))), [events]);
  const allTeams = useMemo(() => [...teams.map(t => t.name), "N/A"], [teams]);
  
  const volunteersInArea = useMemo(() => {
    return volunteers.filter(v => v.areas.includes(area.name)).sort((a,b) => a.name.localeCompare(b.name));
  }, [volunteers, area.name]);
  
  const availableVolunteers = useMemo(() => {
    return volunteers.filter(v => !v.areas.includes(area.name)).sort((a,b) => a.name.localeCompare(b.name));
  }, [volunteers, area.name]);

  function handleAddVolunteerSubmit() {
    if (!volunteerToAdd) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Selecione um voluntário para adicionar.' });
        return;
    }
    const volunteer = volunteers.find(v => v.id === volunteerToAdd);
    if(volunteer) {
        updateVolunteer(volunteer.id, { ...volunteer, areas: [...volunteer.areas, area.name] });
        toast({ title: 'Sucesso', description: 'Voluntário adicionado à área.' });
    }
    setVolunteerToAdd('');
    setIsAddVolunteeerDialogOpen(false);
  }

  function openRemoveDialog(volunteer: Volunteer) {
    setVolunteerToRemove(volunteer);
    setIsRemoveVolunteeerDialogOpen(true);
  }

  function confirmRemoveVolunteer() {
    if (!volunteerToRemove) return;
    
    updateVolunteer(volunteerToRemove.id, {
        ...volunteerToRemove,
        areas: volunteerToRemove.areas.filter(a => a !== area.name)
    });

    toast({ title: 'Sucesso', description: `Voluntário removido da área.` });
    setIsRemoveVolunteeerDialogOpen(false);
    setVolunteerToRemove(null);
  }
  
  function handleEditVolunteer(volunteer: Volunteer) {
    setVolunteerToEdit(volunteer);
    form.reset({
      ...volunteer,
      email: volunteer.email || '', // Ensure email is not undefined
    });
    setIsEditVolunteerDialogOpen(true);
  }
  
  function onVolunteerSubmit(data: z.infer<typeof volunteerSchema>) {
    if (volunteerToEdit) {
        const volunteerData = {
          name: data.name,
          team: data.team,
          areas: data.areas,
          availability: data.availability,
          phone: data.phone,
          email: data.email,
        }
        updateVolunteer(volunteerToEdit.id, volunteerData);
        toast({
            title: "Sucesso!",
            description: "Voluntário atualizado.",
            className: "bg-primary text-primary-foreground",
        });
    }
    setIsEditVolunteerDialogOpen(false);
    setVolunteerToEdit(null);
    form.reset();
  }
  
  function handleTeamChange(volunteerId: string, newTeam: string) {
    const volunteer = volunteers.find(v => v.id === volunteerId);
    if (volunteer) {
        updateVolunteer(volunteerId, { ...volunteer, team: newTeam });
        toast({
            title: "Equipe Atualizada",
            description: `${volunteer.name} agora está na equipe ${newTeam}.`
        });
    }
  }


  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/areas"><ChevronLeft className="mr-2 h-4 w-4" /> Voltar para Áreas</Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{area.name}</h1>
        <p className="text-muted-foreground">Gerencie os voluntários desta área de serviço.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Voluntários</CardTitle>
            <CardDescription>{volunteersInArea.length} voluntários nesta área.</CardDescription>
          </div>
            <Dialog open={isAddVolunteeerDialogOpen} onOpenChange={setIsAddVolunteeerDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Voluntário
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Voluntário à Área</DialogTitle>
                        <DialogDescription>
                            Selecione um voluntário para adicionar à área de '{area.name}'.
                        </DialogDescription>
                    </DialogHeader>
                    <Select onValueChange={setVolunteerToAdd} value={volunteerToAdd}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione um voluntário" />
                        </SelectTrigger>
                        <SelectContent>
                        {availableVolunteers.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleAddVolunteerSubmit}>Adicionar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-20 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {volunteersInArea.length > 0 ? volunteersInArea.map((volunteer) => (
                  <TableRow key={volunteer.id}>
                    <TableCell className="font-medium">{volunteer.name}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-auto p-1 text-left font-normal">
                             <Badge variant={volunteer.team === 'N/A' ? 'outline' : 'default'} className="cursor-pointer">
                               {volunteer.team}
                             </Badge>
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {allTeams.map(teamName => (
                             <DropdownMenuItem 
                                key={teamName} 
                                onClick={() => handleTeamChange(volunteer.id, teamName)}
                                disabled={volunteer.team === teamName}
                              >
                              {teamName}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>{volunteer.phone || '-'}</TableCell>
                    <TableCell>{volunteer.email || '-'}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => handleEditVolunteer(volunteer)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openRemoveDialog(volunteer)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Remover da Área
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            Nenhum voluntário nesta área.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Remove Volunteer Dialog */}
      <AlertDialog open={isRemoveVolunteeerDialogOpen} onOpenChange={setIsRemoveVolunteeerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá {volunteerToRemove?.name} da área de {area.name}. O voluntário não será excluído do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveVolunteer}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Volunteer Dialog */}
      <Dialog open={isEditVolunteerDialogOpen} onOpenChange={setIsEditVolunteerDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Editar Voluntário</DialogTitle>
            <DialogDescription>Atualize os dados de {volunteerToEdit?.name}.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onVolunteerSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl><Input placeholder="Nome do voluntário" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="team" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipe</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione uma equipe" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {allTeams.map(team => <SelectItem key={team} value={team}>{team}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Celular</FormLabel>
                        <FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="areas" render={() => (
                    <FormItem>
                        <FormLabel>Áreas de Serviço</FormLabel>
                        <div className="space-y-2 p-2 border rounded-md max-h-40 overflow-y-auto">
                        {areasOfService.map((area) => (
                            <FormField key={area.name} control={form.control} name="areas" render={({ field }) => (
                            <FormItem key={area.name} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                <Checkbox
                                    checked={field.value?.includes(area.name)}
                                    onCheckedChange={(checked) => {
                                    return checked
                                        ? field.onChange([...(field.value || []), area.name])
                                        : field.onChange(field.value?.filter((value) => value !== area.name));
                                    }}
                                />
                                </FormControl>
                                <FormLabel className="font-normal">{area.name}</FormLabel>
                            </FormItem>
                            )} />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="availability" render={() => (
                    <FormItem>
                        <FormLabel>Disponibilidade</FormLabel>
                         <div className="space-y-2 p-2 border rounded-md max-h-40 overflow-y-auto">
                        {availabilityItems.map((item) => (
                             <FormField key={item} control={form.control} name="availability" render={({ field }) => (
                            <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                    return checked
                                        ? field.onChange([...(field.value || []), item])
                                        : field.onChange(field.value?.filter((value) => value !== item));
                                    }}
                                />
                                </FormControl>
                                <FormLabel className="font-normal">{item}</FormLabel>
                            </FormItem>
                            )} />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
