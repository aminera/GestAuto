const toOptions = (map) => Object.entries(map).map(([value, label]) => ({ value, label }));

export const VEHICLE_STATUS = { active: 'Actif', maintenance: 'En maintenance', inactive: 'Inactif' };
export const FUEL = { diesel: 'Diesel', essence: 'Essence', hybride: 'Hybride', electrique: 'Électrique', gpl: 'GPL' };
export const CATEGORY = { voiture: 'Voiture', utilitaire: 'Utilitaire', camion: 'Camion', moto: 'Moto', engin: 'Engin' };
export const MAINTENANCE_TYPE = { vidange: 'Vidange', revision: 'Révision', pneus: 'Pneus', freins: 'Freins', distribution: 'Distribution', batterie: 'Batterie', carrosserie: 'Carrosserie', autre: 'Autre' };
export const MAINTENANCE_STATUS = { planned: 'Planifié', done: 'Réalisé', cancelled: 'Annulé' };
export const DOCUMENT_TYPE = { assurance: 'Assurance', carte_grise: 'Carte grise', controle_technique: 'Contrôle technique', vignette: 'Vignette', permis: 'Permis', autorisation: 'Autorisation', autre: 'Autre' };
export const ROLES = { admin: 'Administrateur', manager: 'Gestionnaire', viewer: 'Lecture seule' };
export const ALERT_TYPE = {
  overspeed: 'Excès de vitesse', geofence_enter: 'Entrée de zone', geofence_exit: 'Sortie de zone',
  ignition_on: 'Contact mis', ignition_off: 'Contact coupé', unplug: 'Débranchement', low_voltage: 'Tension faible',
  crash: 'Choc', towing: 'Remorquage', jamming: 'Brouillage', harsh_driving: 'Conduite brusque',
  device_offline: 'Boîtier hors ligne', maintenance_due: 'Entretien', document_expiry: 'Document',
};
export const SEVERITY_TONE = { info: 'blue', warning: 'amber', critical: 'red' };

export const options = {
  vehicleStatus: toOptions(VEHICLE_STATUS),
  fuel: toOptions(FUEL),
  category: toOptions(CATEGORY),
  maintenanceType: toOptions(MAINTENANCE_TYPE),
  maintenanceStatus: toOptions(MAINTENANCE_STATUS),
  documentType: toOptions(DOCUMENT_TYPE),
  roles: toOptions(ROLES),
  alertType: toOptions(ALERT_TYPE),
};
