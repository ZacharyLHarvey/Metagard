-- All caster classes carry a Dagger per class equipment rules.
update public.classes
set weapons = 'Dagger'
where name in ('Bard', 'Druid', 'Healer', 'Wizard');
