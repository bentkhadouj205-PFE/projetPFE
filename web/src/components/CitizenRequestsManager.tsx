import { useState } from 'react';
import { API_BASE_URL } from '@/lib/apiBase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function CitizenRequestForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    nin: '',
    subject: 'Fiche de Résidence',
    description: '',
    wilaya: '',
    commune: '',
    actYear: '',
    actNumber: '',
  });
  const isBirthAct = formData.subject.toLowerCase().includes('naissance');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/requests/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenData: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            nin: formData.nin,
            ...(isBirthAct
              ? {
                  wilaya: formData.wilaya,
                  commune: formData.commune,
                  actYear: formData.actYear,
                  actNumber: formData.actNumber,
                }
              : {}),
          },
          subject: formData.subject,
          description: formData.description,
          serviceType: formData.subject,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Demande soumise! Assignée à: ${data.assignedTo}`);
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          nin: '',
          subject: 'Fiche de Résidence',
          description: '',
          wilaya: '',
          commune: '',
          actYear: '',
          actNumber: '',
        });
      } else {
        toast.error(data.message || 'Erreur lors de la soumission');
      }
    } catch (error) {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold">Nouvelle Demande</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Prénom</Label>
          <Input 
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            required 
          />
        </div>
        <div>
          <Label>Nom</Label>
          <Input 
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            required 
          />
        </div>
      </div>
      
      <div>
        <Label>Email</Label>
        <Input 
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required 
        />
      </div>
      
      <div>
        <Label>NIN (Numéro d'Identification Nationale)</Label>
        <Input 
          value={formData.nin}
          onChange={(e) => setFormData({...formData, nin: e.target.value})}
          required 
        />
      </div>
      
      <div>
        <Label>Type de demande</Label>
        <select 
          className="w-full border rounded-md p-2"
          value={formData.subject}
          onChange={(e) => setFormData({...formData, subject: e.target.value})}
        >
          <option>Fiche de Résidence</option>
          <option>Certificat de résidence</option>
          <option>Acte de naissance</option>
          <option>Certificat de mariage</option>
        </select>
      </div>

      {isBirthAct && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Wilaya</Label>
            <Input
              value={formData.wilaya}
              onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
              placeholder="Ex. Alger"
              required
            />
          </div>
          <div>
            <Label>Commune</Label>
            <Input
              value={formData.commune}
              onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
              placeholder="Ex. Bab El Oued"
              required
            />
          </div>
          <div>
            <Label>Année de l&apos;acte</Label>
            <Input
              value={formData.actYear}
              onChange={(e) => setFormData({ ...formData, actYear: e.target.value })}
              placeholder="Ex. 2010"
              required
            />
          </div>
          <div>
            <Label>N° de l&apos;acte</Label>
            <Input
              value={formData.actNumber}
              onChange={(e) => setFormData({ ...formData, actNumber: e.target.value })}
              placeholder="Ex. 12345"
              required
            />
          </div>
        </div>
      )}
      
      <div>
        <Label>Description</Label>
        <textarea 
          className="w-full border rounded-md p-2"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Envoi en cours...' : 'Soumettre la demande'}
      </Button>
    </form>
  );
}