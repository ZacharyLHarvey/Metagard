-- Apex does not block Adaptive Protection; restore canon limitation text if a prior patch added it.
update public.spells
set limitation = 'Loses all instances of Evolution, Hold Person, Pinning Arrow.'
where name = 'Apex' and type = 'Archetype';
