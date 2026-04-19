export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  createdAt: Date;
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  company?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  notes?: string | null;
  status: string;
  createdAt: Date;
  registrationId?: number | null;
  userId: string;
  _count?: {
    transactions: number;
    services: number;
  };
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  status: string;
  dueDate?: Date | string | null;
  paidAt?: Date | string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string;
  clientId?: string | null;
  client?: Pick<Client, "id" | "name"> | null;
}

export interface Service {
  id: string;
  title: string;
  description?: string | null;
  amount: number;
  status: string;
  category?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string;
  clientId?: string | null;
  client?: Pick<Client, "id" | "name"> | null;
}

export interface Event {
  id: string;
  title: string;
  description?: string | null;
  startDate: Date | string;
  endDate?: Date | string | null;
  allDay: boolean;
  type: string;
  status: string;
  location?: string | null;
  googleEventId?: string | null;
  clientId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string;
}

export interface DashboardStats {
  totalReceita: number;
  totalPendente: number;
  totalCancelado: number;
  totalClientes: number;
  totalServicos: number;
  totalOrcamentos: number;
  variacaoReceita: number;
  variacaoPendente: number;
  variacaoClientes: number;
  variacaoServicos: number;
}

export interface ChartData {
  mes: string;
  receita: number;
  despesa: number;
}
