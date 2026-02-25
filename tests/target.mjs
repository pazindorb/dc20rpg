import { DC20Target } from "../module/subsystems/target/target.mjs";

// TODO - PREPARE

export async function runTargetTest(tokenUuid) {
  const token = await fromUuid(tokenUuid);
  const target = DC20Target.fromToken(token);

  // SETUP
  const attackCalcData = {
    defenceKey: "precision",
    canCrit: true,

    skipFor: {},
    isCritMiss: false,
    isCritHit: false,
  }
  const checkCalcData = {
    checkDC: 14,
    canCrit: true,
    
    skipFor: {},
    isCritMiss: false,
    isCritHit: false,
  }
  const contestCalcData = {
    againstDC: 17,

  }

  target.addDamageRoll({
    each5Value: null,
    failValue: null,
    value: 1,
    source: "Base Value",
    type: "fire"
  });
  target.addDamageRoll({
    each5Value: 1,
    failValue: 0,
    value: 1,
    source: "Base Value",
    type: "cold"
  });

  target.addHealingRoll({
    each5Value: 1,
    failValue: 1,
    value: 2,
    source: "Base Value",
    type: "heal"
  });
  // target.addHealingRoll({
  //   each5Value: null,
  //   failValue: null,
  //   value: 2,
  //   source: "Base Value",
  //   type: "temporary"
  // });

  target.addOtherRoll({
    label: "OTHER ROLL",
    source: "Base Value",
    perTarget: true,
    each5Value: 2,
    failValue: 1,
    value: 3,
  });


  // TEST ATTACK 
  console.log("+++++ ATTACK HIT (16)");
  target.setCoreRollValue(16);
  await target.calculateAttack(attackCalcData);
  console.log(target.prettyPrint());

  console.log("+++++ ATTACK HIT (16 - skip heavy)");
  target.setCoreRollValue(16);
  await target.calculateAttack({...attackCalcData, skipFor: {heavy: true}});
  console.log(target.prettyPrint());

  console.log("+++++ ATTACK HIT (22 - skip brutal)");
  target.setCoreRollValue(22);
  await target.calculateAttack({...attackCalcData, skipFor: {brutal: true}});
  console.log(target.prettyPrint());

  // TEST CRIT ATTACK - should always hit
  console.log("+++++ ATTACK HIT (crit)");
  target.setCoreRollValue(1);
  await target.calculateAttack({...attackCalcData, isCritHit: true});
  console.log(target.prettyPrint());

  console.log("+++++ ATTACK HIT (crit - skip crit)");
  target.setCoreRollValue(1);
  await target.calculateAttack({...attackCalcData, isCritHit: true, skipFor: {crit: true}});
  console.log(target.prettyPrint());

  // TEST MISS
  console.log("+++++ ATTACK MISS (2)");
  target.setCoreRollValue(2);
  await target.calculateAttack(attackCalcData);
  console.log(target.prettyPrint());

  // TEST CRIT MISS - should always miss
  console.log("+++++ ATTACK CRIT MISS");
  target.setCoreRollValue(20);
  await target.calculateAttack({...attackCalcData, isCritMiss: true});
  console.log(target.prettyPrint());



  // TEST CHECK SUCCESS
  console.log("||||| CHECK SUCCESS");
  target.setCoreRollValue(15);
  await target.calculateCheck(checkCalcData);
  console.log(target.prettyPrint());

  // TEST CHECK FAIL
  console.log("||||| CHECK FAIL");
  target.setCoreRollValue(5);
  await target.calculateCheck(checkCalcData);
  console.log(target.prettyPrint());

  // TEST CHECK EACH 5
  console.log("||||| CHECK EACH 5 (OVER 10)");
  target.setCoreRollValue(24);
  await target.calculateCheck(checkCalcData);
  console.log(target.prettyPrint());

  // TEST CHECK CRIT FAIL
  console.log("||||| CHECK CRIT FAIL");
  target.setCoreRollValue(25);
  await target.calculateCheck({...checkCalcData, isCritMiss: true});
  console.log(target.prettyPrint());

  // TEST CHCEK CRIT SUCCESS
  console.log("||||| CHECK CRIT SUCCESS");
  target.setCoreRollValue(15);
  await target.calculateCheck({...checkCalcData, isCritHit: true});
  console.log(target.prettyPrint());



  // TEST CONTEST SUCCESS
  console.log(">>>>> CONTEST SUCCESS - caster succeeded <3>");
  target.setTargetRollValue(15);
  await target.calculateCheck(contestCalcData);
  console.log(target.prettyPrint());

  // TEST CONTEST FAIL
  console.log(">>>>> CONTEST FAIL - contested succeeded <1>");
  target.setTargetRollValue(19);
  await target.calculateCheck(contestCalcData);
  console.log(target.prettyPrint());

  // TEST CONTEST EACH 5 FAIL
  console.log(">>>>> CONTEST FAIL EACH 5 (7 vs 17 DC) [10] <7>");
  target.setTargetRollValue(7);
  await target.calculateCheck(contestCalcData);
  console.log(target.prettyPrint());

  // TEST CONTEST CRIT FAIL
  console.log(">>>>> CONTEST CRIT FAIL <1>");
  target.setTargetRollValue(22);
  await target.calculateCheck({...contestCalcData, isCritMiss: true});
  console.log(target.prettyPrint());

  // TEST CONTEST CRIT SUCCESS
  console.log(">>>>> CONTEST CRIT SUCCESS <1>");
  target.setTargetRollValue(19);
  await target.calculateCheck({...contestCalcData, isCritHit: true});
  console.log(target.prettyPrint());


  // TEST STACKING SIMILAR FORMULAS
  console.log(">>>>> ATTACK STACKING FORMULAS");
  target.addDamageRoll({
    each5Value: 1,
    failValue: 0,
    value: 1,
    source: "Base Value",
    type: "fire",
    dontMerge: true
  });
  target.addDamageRoll({
    each5Value: 1,
    failValue: 0,
    value: 2,
    source: "Base Value",
    type: "fire",
    overrideDefence: "area"
  });
  target.setCoreRollValue(16);
  await target.calculateAttack(attackCalcData);
  console.log(target.prettyPrint());

  target.setCoreRollValue(22);
  console.log(">>>>> CHECK STACKING FORMULAS (each 5) <4>");
  await target.calculateCheck(checkCalcData);
  console.log(target.prettyPrint());

  target.setCoreRollValue(11);
  console.log(">>>>> CHECK STACKING FORMULAS (fail) <1>");
  await target.calculateCheck(checkCalcData);
  console.log(target.prettyPrint());

  // TEST APPLY DAMAGE 
  console.log("@@@@@ Apply damage <3>");
  target.setCoreRollValue(15);
  target.damage = []; target.healing = []; target.other = []; 
  target.addDamageRoll({
    each5Value: 1,
    failValue: 0,
    value: 2,
    source: "Base Value",
    type: "fire"
  });
  await target.calculateAttack(attackCalcData);
  console.log(target.prettyPrint());
  await target.calculated.damage[0].modified.apply();
  

  // TEST APPLY HEALING
  console.log("@@@@@ Apply healing <4>");
  target.damage = [];
  // TEST APPLY HEALING OVERHEAL FORBID
  target.setCoreRollValue(25);
  target.addHealingRoll({
    each5Value: 1,
    failValue: 1,
    value: 2,
    source: "Base Value",
    type: "heal"
  });
  await target.calculateCheck(checkCalcData);
  console.log(target.prettyPrint());
  // await target.calculated.healing[0].modified.apply();


  // TEST APPLY HEALING OVERHEAL ALLOW
  console.log("@@@@@ Apply healing <4>");
  target.healing = [];
  target.addHealingRoll({
    each5Value: 1,
    failValue: 1,
    value: 2,
    source: "Base Value",
    type: "heal",
    allowOverheal: true
  });
  target.setCoreRollValue(25);
  await target.calculateCheck(checkCalcData);
  console.log(target.prettyPrint());
  await target.calculated.healing[0].modified.apply();


   // TEST APPLY TEMPORARY
  console.log("@@@@@ Apply temporary <4>");
  target.healing = [];
  target.addHealingRoll({
    each5Value: 1,
    failValue: 1,
    value: 2,
    source: "Base Value",
    type: "temporary",
    allowOverheal: true
  });
  target.setCoreRollValue(25);
  await target.calculateCheck(checkCalcData);
  console.log(target.prettyPrint());
  await target.calculated.healing[0].modified.apply();

}