## TODO:

|    STATUS    |   				TASK                    |
|--------------|----------------------------------|
|	   DONE	     |	BIG REWORK WHEN ALL RULLES ARE KNOWN	|
|	   DONE	     |	Free item roll when holding Alt			|
|	   DONE	  	 |	Initative and Combat					  |
|	   DONE	     |	Rest UI and system					    |
|      DONE      |	Resistances	and DR						  |
|      DONE      |	Technique and Spell Enhancements UI and config	|
|	   DONE	     |	Buttons on chat message for adding/removing hp from tokens also make crits green and crit fails red	|
|	   DONE	     |	Add Conditions with effects	    |
|	   DONE	     |	Refresh Action Points on turn end during combat	also add Turn Refresh and Combat Refresh  |
|	   DONE	     |	Refresh Items on turn/combat end  |
|	   DONE	     |	Target token to better calculate damage  |
|	   DONE	     |	Class/Ancestry/Subclass rework and advancement system  |
|	   DONE	     |	Mark item as reaction  |
|	 NOT DONE	 |	If Conditions for effects and effects update |
|	   DONE	     |	Modifications for core rolls (bless, etc)  |
|	   DONE	     |	Clickable Help dice on character sheet  |
|	   DONE	     |	Custom languages like custom knowledge skills |
|	 NOT DONE	 |	Change token size depending on actor size |
|	   DONE	     |	Improvements for Advancements |
|    NOT DONE    |  Classes can add custom resources (Arcane Points, Ki, etc)    |
|    NOT DONE    |  Half damage on miss (example of Ice Knife spell) (also maybe things like impact, great weapon fighting etc?)    |
|	   DONE	     |  Initiative toogle button    |
|    NOT DONE    |  Advantages/Disadvantages for rolls form formulas (skill check, saves, etc)    |
||
|	   IDEA	     |	Item Resources usable like Custom Resources by items?	|
|	   IDEA	     |	Active Effects keys as selectable dropdown 	|
|	   IDEA	     |	Buttons to roll Mental/Physical saves and Martial Check?	|
|	   DONE	     |	Additional info about different actions in game (help, attack, itp) (as popup with buttons?)	|
|	   IDEA	     |	Change adding unique items to actors from hooks to Actor.prepareEmbeddedDocuments method	|
||
|	 DO LATER	 |	Character Sheet design					|
|	 DO LATER    |	Redesign of NPC Sheet	    |
|	 DO LATER	 |	Encumbrance and Money					  |
|	 DO LATER	 |	Encumbrance and Money					  |
|	 DO LATER	 |	Overall code refactor					  |
|	   DONE	     |	Subclass and Ancestry Items			|

## Changelog

## Bug fixes
- Fixed uuid issue for system built in compendiums (You dont need to duplicate them anymore :D)
- Fixed bug that made it impossible to remove items from advancements
- Fixed an issue causing token added to combat not being initialized with data after refreshing page


## Changes
- Added missing Fiendborn Ancestry Advancements
- Added custom languages
- Class advancements improvements + updates to ancestries compendiums.
- Added global formula modifiers. Now rolls can be modified by effects like Bless or Bane
- Added Initative toogle button and some initative improvments