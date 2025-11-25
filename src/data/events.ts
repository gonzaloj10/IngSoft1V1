import { Event } from '../types';

export const events: Event[] = [
  {
    id: '1',
    title: 'Sinergia',
    artist: 'Sinergia - Reunión 2024',
    date: '15 de marzo, 2024',
    time: '20:00 hrs',
    venue: 'Estadio Nacional',
    location: 'Santiago, Chile',
    price: 45000,
    image: 'https://images.unsplash.com/photo-1543147012-c049aefea8a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwY3Jvd2QlMjBmZXN0aXZhbHxlbnwxfHx8fDE3NTk1MjczMDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'La banda más emblemática de rock chileno vuelve a los escenarios con un show único e inolvidable. No te pierdas esta oportunidad de revivir los clásicos.',
    category: 'Rock',
    availableTickets: 150
  },
  {
    id: '2',
    title: 'Fiesta Electrónica Universo',
    artist: 'DJ Universe',
    date: '22 de marzo, 2024',
    time: '22:00 hrs',
    venue: 'Club Groove',
    location: 'Santiago, Chile',
    price: 25000,
    image: 'https://images.unsplash.com/photo-1612729829113-59e5c3a3d107?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGZlc3RpdmFsJTIwZGp8ZW58MXx8fHwxNzU5NjI2NjYwfDA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Una noche de música electrónica con los mejores DJs de la escena local e internacional. Prepárate para bailar hasta el amanecer.',
    category: 'Electrónica',
    availableTickets: 200
  },
  {
    id: '3',
    title: 'Rock en el Valle 2024',
    artist: 'Varios Artistas',
    date: '29 de marzo, 2024',
    time: '18:00 hrs',
    venue: 'Parque Valle del Sol',
    location: 'Valparaíso, Chile',
    price: 38000,
    image: 'https://images.unsplash.com/photo-1747003869273-9fc7ad373137?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2NrJTIwY29uY2VydCUyMHN0YWdlfGVufDF8fHx8MTc1OTYyNjY2MXww&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'El festival de rock más grande del año. Múltiples escenarios con las mejores bandas nacionales e internacionales.',
    category: 'Rock',
    availableTickets: 300
  },
  {
    id: '4',
    title: 'Noche de Indie Experience',
    artist: 'The Indie Collective',
    date: '5 de abril, 2024',
    time: '21:00 hrs',
    venue: 'Teatro Cariola',
    location: 'Santiago, Chile',
    price: 18000,
    image: 'https://images.unsplash.com/photo-1653569395995-39daf1602fb2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljJTIwbXVzaWMlMjBwYXJ0eXxlbnwxfHx8fDE3NTk2MjY2NjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Una experiencia íntima con lo mejor de la música indie local. Descubre nuevos talentos en un ambiente único.',
    category: 'Indie',
    availableTickets: 120
  },
  {
    id: '5',
    title: 'Ritmos Urbanos',
    artist: 'Varios Artistas Urbanos',
    date: '12 de abril, 2024',
    time: '20:30 hrs',
    venue: 'Movistar Arena',
    location: 'Santiago, Chile',
    price: 32000,
    image: 'https://images.unsplash.com/photo-1677957855684-866bda07805e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpZSUyMGJhbmQlMjBwZXJmb3JtYW5jZXxlbnwxfHx8fDE3NTk2MjY2NjF8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'El evento urbano del año con los exponentes más destacados del reggaetón, trap y hip hop en español.',
    category: 'Urbano',
    availableTickets: 250
  },
  {
    id: '6',
    title: 'Jazz & Blues Night',
    artist: 'Jazz Masters Ensemble',
    date: '19 de abril, 2024',
    time: '19:30 hrs',
    venue: 'Club de Jazz',
    location: 'Santiago, Chile',
    price: 22000,
    image: 'https://images.unsplash.com/photo-1563284573-51f0b7d93e40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXp6JTIwY29uY2VydCUyMHZlbnVlfGVufDF8fHx8MTc1OTYyNjY2MXww&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Una velada elegante con los mejores músicos de jazz y blues. Disfruta de una noche sofisticada con excelente música en vivo.',
    category: 'Jazz',
    availableTickets: 80
  }
];
