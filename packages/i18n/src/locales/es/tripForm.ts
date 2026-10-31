import type { TranslationSchema } from '../../types';

const tripForm: TranslationSchema['tripForm'] = {
  overline: {
    onboarding: 'Paso 2 de 2',
    newPast: 'Nuevo viaje',
    newFuture: 'Nuevo destino',
    edit: 'Editar',
  },
  title: {
    past: 'Cuéntanos un viaje que hiciste',
    future: '¿A dónde quieres ir?',
    edit: 'Editar viaje',
  },
  sub: {
    past: 'Con el destino y el nombre alcanza. El resto lo completas cuando quieras.',
    future: 'Guarda el destino ahora. Los recuerdos y gastos quedan para cuando el viaje suceda.',
    edit: 'Quien colabora también puede editar esta información.',
  },
  kind: {
    label: 'Tipo de registro',
    past: 'Ya fui',
    future: 'Quiero ir',
  },
  dest: 'Destino',
  destPlaceholder: '¿A dónde vamos?',
  name: {
    past: 'Nombre del viaje',
    future: 'Nombre del destino',
  },
  namePlaceholder: {
    past: 'Invierno en Floripa',
    future: 'Cerezos en Japón',
  },
  errors: {
    dest: 'Falta decir a dónde fuiste.',
    name: 'Ponle un nombre a este viaje.',
  },
  collab: {
    past: 'Quién fue contigo',
    future: 'Quién va contigo',
    remove: 'Quitar a {{name}}',
    inviteLink: 'Invitar por enlace',
    linkCopied: 'Enlace de invitación copiado. Quien entre se vuelve colaborador.',
  },
  when: 'Cuándo fue',
  whenPlaceholder: 'Julio de 2025',
  tripType: 'Tipo de viaje',
  types: {
    solo: 'Solo(a)',
    couple: 'Pareja',
    family: 'Familia',
    friends: 'Amigos',
    work: 'Trabajo',
  },
  food: 'Gastronomía',
  foodPlaceholder: '¿Qué fue lo mejor que comiste?',
  shopping: 'Compras',
  shoppingPlaceholder: '¿Trajiste algo de allá?',
  experiences: 'Otras experiencias',
  exp: {
    beach: 'Playa',
    trail: 'Senderismo',
    museum: 'Museo',
    show: 'Concierto',
    boat: 'Barco',
    nightlife: 'Vida nocturna',
    party: 'Fiesta local',
  },
  photosTitle: 'Fotos de este viaje',
  photosText: 'Puedes importarlas después, desde tu perfil.',
  save: {
    past: 'Guardar en mi mapa',
    future: 'Guardar destino',
    edit: 'Guardar cambios',
  },
  toasts: {
    pastSaved: 'Viaje guardado en tu mapa.',
    pastInvited: 'Viaje guardado. Invitación enviada a {{names}}.',
    futureSaved: 'Destino guardado. ¿Vamos?',
    futureInvited: 'Destino guardado. Invitación enviada a {{names}}.',
    updated: 'Viaje actualizado.',
    updatedInvited: 'Viaje actualizado. Invitación enviada a {{names}}.',
  },
  defaults: {
    period: 'Fecha por definir',
    savedNow: 'Guardado ahora',
    destNote: 'Destino: {{dest}}',
  },
};

export default tripForm;
