import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Copy, Trash2, PlayCircle, Plus, Eye, EyeOff } from 'lucide-react';

interface Webhook {
  id: number;
  url: string;
  eventTypes: string;
  active: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  failureCount: number;
  deliveries?: any[];
}

const EVENT_TYPES = [
  { value: 'lead.created', label: 'Lead Created' },
  { value: 'lead.status_changed', label: 'Lead Status Changed' },
  { value: 'campaign.sent', label: 'Campaign Sent' },
  { value: 'form.submitted', label: 'Form Submitted' },
];

export default function Webhooks() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ url: '', eventTypes: [] as string[] });
  const [showSecret, setShowSecret] = useState<{ [key: number]: boolean }>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: webhooks = [] } = useQuery({
    queryKey: ['/api/webhooks'],
    queryFn: async () => {
      const res = await fetch('/api/webhooks');
      return res.json() as Promise<Webhook[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create webhook');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks'] });
      setIsOpen(false);
      setFormData({ url: '', eventTypes: [] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete webhook');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks'] });
      setDeleteId(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (webhook: Webhook) => {
      const res = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !webhook.active }),
      });
      if (!res.ok) throw new Error('Failed to update webhook');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to test webhook');
      return res.json();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url || formData.eventTypes.length === 0) {
      alert('Please enter URL and select at least one event type');
      return;
    }
    createMutation.mutate({
      url: formData.url,
      eventTypes: JSON.stringify(formData.eventTypes),
    });
  };

  const toggleEventType = (eventType: string) => {
    setFormData(prev => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(eventType)
        ? prev.eventTypes.filter(e => e !== eventType)
        : [...prev.eventTypes, eventType],
    }));
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure webhooks to receive real-time events
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register Webhook</DialogTitle>
              <DialogDescription>
                Configure a webhook URL to receive events from GlobalReach CRM
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="url">Webhook URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com/webhooks"
                  value={formData.url}
                  onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div>
                <Label>Event Types</Label>
                <div className="space-y-2 mt-2">
                  {EVENT_TYPES.map(event => (
                    <div key={event.value} className="flex items-center gap-2">
                      <Checkbox
                        id={event.value}
                        checked={formData.eventTypes.includes(event.value)}
                        onCheckedChange={() => toggleEventType(event.value)}
                      />
                      <Label htmlFor={event.value} className="cursor-pointer">{event.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Webhook'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {webhooks.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            <p>No webhooks configured yet</p>
            <p className="text-sm mt-1">Create a webhook to start receiving events</p>
          </Card>
        ) : (
          webhooks.map(webhook => (
            <Card key={webhook.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{webhook.url}</h3>
                    <div
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        webhook.active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {webhook.active ? 'Active' : 'Inactive'
