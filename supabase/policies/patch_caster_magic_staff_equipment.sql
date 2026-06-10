-- Caster classes carry Dagger and Magic Staff (display equipment on view build).
update public.classes
set weapons = 'Dagger, Magic Staff'
where name in ('Bard', 'Druid', 'Healer', 'Wizard');
