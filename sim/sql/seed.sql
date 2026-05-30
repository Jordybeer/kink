insert into sim_personas
  (id, name, role, experience_level, session_count, last_active, traits,
   features_discovered, kinks_filled_count, contracts_generated,
   onboarding_complete, profile_tour_complete, partners, last_state, notes)
values
  (
    'robin', 'Robin', 'submissive', 'beginner',
    0, null,
    '{"curiosity": 2, "trust": 2, "impulsivity": 1, "thoroughness": 8}',
    '[]', 0, 0, false, false, '[]', null,
    'Cautious first-timer. Reads everything. Will not explore unprompted. Expected to grow slowly but fill kinks very thoroughly.'
  ),
  (
    'leo', 'Leo', 'switch', 'gevorderd',
    0, null,
    '{"curiosity": 6, "trust": 4, "impulsivity": 7, "thoroughness": 3}',
    '[]', 0, 0, false, false, '[]', null,
    'Impulsive explorer. Skips steps, uses browser back, bulk-skips categories. High curiosity will surface new routes fast but thoroughness is low.'
  ),
  (
    'iris', 'Iris', 'dominant', 'ervaren',
    0, null,
    '{"curiosity": 5, "trust": 5, "impulsivity": 2, "thoroughness": 7}',
    '[]', 0, 0, false, false, '[]', null,
    'Thorough and methodical. Balanced starting traits. Expected to grow into full power-user behaviour around session 8-10.'
  );
