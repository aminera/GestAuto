import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');
const optionalRef = objectId.nullable().optional().or(z.literal('').transform(() => null));
const date = z.coerce.date();
const optStr = z.string().trim().optional().nullable();
const optNum = z.coerce.number().optional().nullable();
const point = z.object({ type: z.literal('Point').default('Point'), coordinates: z.tuple([z.number(), z.number()]) });

export const vehicleSchema = z.object({
  plate: z.string().trim().min(2),
  brand: optStr, model: optStr, vin: optStr, color: optStr, notes: optStr,
  year: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  fuelType: z.enum(['diesel', 'essence', 'hybride', 'electrique', 'gpl']).optional(),
  category: z.enum(['voiture', 'utilitaire', 'camion', 'moto', 'engin']).optional(),
  status: z.enum(['active', 'maintenance', 'inactive']).optional(),
  speedLimit: z.coerce.number().min(10).max(250).optional(),
  odometerKm: optNum,
  device: optionalRef,
  driver: optionalRef,
});

export const driverSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: optStr, email: z.string().email().optional().nullable().or(z.literal('')),
  licenseNumber: optStr, licenseCategories: z.array(z.string()).optional(),
  licenseExpiry: date.optional().nullable(),
  ibutton: optStr, notes: optStr,
  active: z.boolean().optional(),
});

export const deviceSchema = z.object({
  imei: z.string().regex(/^\d{15,17}$/, 'IMEI : 15 chiffres'),
  model: optStr, simNumber: optStr, simOperator: optStr, firmware: optStr,
  active: z.boolean().optional(),
});

export const geofenceSchema = z.object({
  name: z.string().trim().min(1),
  description: optStr,
  shape: z.enum(['circle', 'polygon']),
  center: point.optional().nullable(),
  radius: z.coerce.number().min(10).optional().nullable(),
  area: z.object({ type: z.literal('Polygon').default('Polygon'), coordinates: z.array(z.array(z.tuple([z.number(), z.number()])).min(4)) }).optional().nullable(),
  color: optStr,
  vehicles: z.array(objectId).optional(),
  alertOnEnter: z.boolean().optional(),
  alertOnExit: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const maintenanceSchema = z.object({
  vehicle: objectId,
  type: z.enum(['vidange', 'revision', 'pneus', 'freins', 'distribution', 'batterie', 'carrosserie', 'autre']),
  description: optStr,
  status: z.enum(['planned', 'done', 'cancelled']).optional(),
  dueDate: date.optional().nullable(),
  dueOdometerKm: optNum,
  doneAt: date.optional().nullable(),
  odometerAtService: optNum,
  cost: optNum, garage: optStr, notes: optStr,
});

export const documentSchema = z.object({
  type: z.enum(['assurance', 'carte_grise', 'controle_technique', 'vignette', 'permis', 'autorisation', 'autre']),
  vehicle: optionalRef, driver: optionalRef,
  reference: optStr, provider: optStr,
  issueDate: date.optional().nullable(),
  expiryDate: date.optional().nullable(),
  cost: optNum, fileUrl: optStr, notes: optStr,
}); // contrôle "véhicule ou conducteur" fait dans le modèle Mongoose

export const userSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
  active: z.boolean().optional(),
});

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const commandSchema = z.object({ command: z.string().trim().min(1).max(200) });
