import { SimplePopup } from "../../../dialogs/simple-popup.mjs";
import { getValueFromPath } from "../../../helpers/utils.mjs";

export default class GFModFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    fields = {
      attributeCheck: new f.ArrayField(new f.StringField(), {required: true}),  // TODO backward compatibilty remove as part of 0.10.5 update
      attackCheck: new f.ArrayField(new f.StringField(), {required: true}),  // TODO backward compatibilty remove as part of 0.10.5 update
      spellCheck: new f.ArrayField(new f.StringField(), {required: true}),  // TODO backward compatibilty remove as part of 0.10.5 update
      skillCheck: new f.ArrayField(new f.StringField(), {required: true}),  // TODO backward compatibilty remove as part of 0.10.5 update
      save: new f.ArrayField(new f.StringField(), {required: true}),  // TODO backward compatibilty remove as part of 0.10.5 update
      damage: new f.SchemaField({
        martial: new f.SchemaField({
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
          area: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        spell: new f.SchemaField({
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
          area: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        any: new f.ArrayField(new f.StringField(), {required: true}),
      }),
      healing: new f.ArrayField(new f.StringField(), {required: true}),
      ...fields
    };
    super(fields, options);
  }
}

export async function extractGFModValue(key, actor) {
  if (!actor || !key) return [{value: "", source: ""}, []];

  const globalModJson = getValueFromPath(actor.system.globalFormulaModifiers, key) || [];
  const globalMod = {value: "", source: ""};
  const afterRoll = [];

  for (let json of globalModJson) {
    if (!json) continue;
    try {
      const mod = JSON.parse(`{${json}}`);
      
      if (mod.confirmation) {
        const confirmed = await SimplePopup.confirm(`Should "${mod.source}" be applied as part of that roll?`);
        if (!confirmed) continue;
      }

      if (mod.afterRoll) {
        const tokens = actor.getActiveTokens();
        afterRoll.push({
          actorId: actor._id, 
          tokenId: tokens[0].id,
          effectId: mod.effectId, 
          afterRoll: mod.afterRoll
        });
      }

      globalMod.value += mod.value;
      if (globalMod.source === "") globalMod.source += `${mod.source}`
      else globalMod.source += ` + ${mod.source}`
    } catch (e) {
      ui.notifications.error(`Cannot parse global formula modifier json {${json}} with error: ${e}`)
    }
  }

  return [globalMod, afterRoll];
}