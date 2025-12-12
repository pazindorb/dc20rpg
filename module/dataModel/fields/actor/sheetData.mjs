export default class SheetDataFields extends foundry.data.fields.SchemaField {
  constructor(actorType, fields={}, options={}) {
    switch(actorType) {
      case "character": 
        fields = {...defaultFields(), ...pcFields(), ...fields}; break;

      case "storage":
        fields = {...defaultFields(), ...storageFields(), ...fields}; break;

      default: 
        fields = {...defaultFields(), ...npcFields(), ...fields};
    }
    super(fields, options);
  }
}

function defaultFields() {
  const f = foundry.data.fields;
  return {
    show: new f.SchemaField({
      unknownSkills: new f.BooleanField({required: true, initial: true}),
      unknownTrades: new f.BooleanField({required: true, initial: false}),
      unknownLanguages: new f.BooleanField({required: true, initial: false}),
      emptyReductions: new f.BooleanField({required: true, initial: false}),
      emptyConditions: new f.BooleanField({required: true, initial: false}),
      onelinerModeDMR: new f.BooleanField({required: true, initial: true}),
      onelinerModeCI: new f.BooleanField({required: true, initial: true}),
      slots: new f.BooleanField({required: true, initial: true}),
      inactiveEffects: new f.BooleanField({required: true, initial: true}),
      nonessentialEffects: new f.BooleanField({required: true, initial: true}),
    }),
    editMode: new f.BooleanField({required: true, initial: false}),
  };
}

function pcFields() {
  const f = foundry.data.fields;
  const fields = {header: {}};

  fields.header = new f.SchemaField({
    filter: new f.SchemaField({
      inventory: new f.StringField({required: true, initial: ""}),
      features: new f.StringField({required: true, initial: ""}),
      techniques: new f.StringField({required: true, initial: ""}),
      spells: new f.StringField({required: true, initial: ""}),
      favorites: new f.StringField({required: true, initial: ""})
    }),
    order: new f.SchemaField({
      inventory: new f.ObjectField({required: true, initial: {
        weapon: {
          name: new f.StringField({initial: "dc20rpg.table.header.weapon"}),
          order: 0,
          custom: false
        },
        equipment: {
          name: new f.StringField({initial: "dc20rpg.table.header.equipment"}),
          order: 0,
          custom: false
        },
        consumable: {
          name: new f.StringField({initial: "dc20rpg.table.header.consumable"}),
          order: 0,
          custom: false
        },
        loot: {
					name: new f.StringField({initial: "dc20rpg.table.header.loot"}),
					order: 3,
					custom: false
				}
      }}),
      features: new f.ObjectField({required: true, initial: {
				class: {
					name: new f.StringField({initial: "dc20rpg.table.header.class"}),
					order: 0,
					custom: false
				},
				subclass: {
					name: new f.StringField({initial: "dc20rpg.table.header.subclass"}),
					order: 1,
					custom: false
				},
				ancestry: {
					name: new f.StringField({initial: "dc20rpg.table.header.ancestry"}),
					order: 2,
					custom: false
				},
				feature: {
					name: new f.StringField({initial: "dc20rpg.table.header.feature"}),
					order: 3,
					custom: false
				},
				passive: {
					name: new f.StringField({initial: "dc20rpg.table.header.passive"}),
					order: 4,
					custom: false
				}
      }}),
      maneuvers: new f.ObjectField({required: true, initial: {
        maneuver: {
					name: new f.StringField({initial: "dc20rpg.table.header.maneuver"}),
					order: 0,
					custom: false
				},
      }}),
      spells: new f.ObjectField({required: true, initial: {
        spell: {
					name: new f.StringField({initial: "dc20rpg.table.header.spell"}),
					order: 0,
					custom: false
				},
        infusion: {
					name: new f.StringField({initial: "dc20rpg.table.header.infusion"}),
					order: 0,
					custom: false
				},
      }}),
      favorites: new f.ObjectField({required: true, initial: {
				basic: {
					name: new f.StringField({initial: "dc20rpg.table.header.basic"}),
					order: 0,
					custom: false
				},
				feature: {
					name: new f.StringField({initial: "dc20rpg.table.header.feature"}),
					order: 1,
					custom: false
				},
				inventory: {
					name: new f.StringField({initial: "dc20rpg.table.header.inventory"}),
					order: 2,
					custom: false
				},
				maneuver: {
					name: new f.StringField({initial: "dc20rpg.table.header.maneuver"}),
					order: 3,
					custom: false
				},
				spell: {
					name: new f.StringField({initial: "dc20rpg.table.header.spell"}),
					order: 4,
					custom: false
				}
      }}),
    })
  })

  return fields;
}

function npcFields() {
  const f = foundry.data.fields;
  const fields = {header: {}};

  fields.header = new f.SchemaField({
    filter: new f.SchemaField({main: new f.StringField({required: true, initial: ""})}),
    order: new f.SchemaField({
      main: new f.ObjectField({required: true, initial: {
        action: {
          name: new f.StringField({initial: "dc20rpg.table.header.action"}),
          order: 0,
          custom: false
        },
        feature: {
          name: new f.StringField({initial: "dc20rpg.table.header.feature"}),
          order: 0,
          custom: false
        },
        maneuver: {
          name: new f.StringField({initial: "dc20rpg.table.header.maneuver"}),
          order: 0,
          custom: false
        },
        spell: {
					name: new f.StringField({initial: "dc20rpg.table.header.spell"}),
					order: 3,
					custom: false
				},
        inventory: {
					name: new f.StringField({initial: "dc20rpg.table.header.inventory"}),
					order: 3,
					custom: false
				}
      }})
    })
  })
  
  return fields;
}

function storageFields() {
  const f = foundry.data.fields;
  const fields = {header: {}};

  fields.header = new f.SchemaField({
    filter: new f.SchemaField({inventory: new f.StringField({required: true, initial: ""})}),
    order: new f.SchemaField({
      inventory: new f.ObjectField({required: true, initial: {
        weapon: {
          name: new f.StringField({initial: "dc20rpg.table.header.weapon"}),
          order: 0,
          custom: false
        },
        equipment: {
          name: new f.StringField({initial: "dc20rpg.table.header.equipment"}),
          order: 0,
          custom: false
        },
        consumable: {
          name: new f.StringField({initial: "dc20rpg.table.header.consumable"}),
          order: 0,
          custom: false
        },
        loot: {
					name: new f.StringField({initial: "dc20rpg.table.header.loot"}),
					order: 3,
					custom: false
				}
      }})
    })
  })
  
  return fields;
}