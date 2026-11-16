import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShoppingRows, createMealPlanner, isDuplicateRecipe, parseRecipeIngredient } from '../meal-planner.js';

test('parses common metric, kitchen and fractional ingredient quantities', () => {
  assert.deepEqual(parseRecipeIngredient('1 ½ cups flour'), {raw:'1 ½ cups flour',amount:1.5,unit:'cups',food:'flour'});
  assert.deepEqual(parseRecipeIngredient('2 eggs'), {raw:'2 eggs',amount:2,unit:'',food:'eggs'});
  assert.deepEqual(parseRecipeIngredient('½ lemon'), {raw:'½ lemon',amount:0.5,unit:'',food:'lemon'});
  assert.deepEqual(parseRecipeIngredient('a handful of parsley'), {raw:'a handful of parsley',amount:null,unit:'',food:'a handful of parsley'});
});

test('scales and consolidates the same recipe ingredients across planned meals', () => {
  const recipes=[{id:'r1',yield:2,ingredients:[parseRecipeIngredient('200 g pasta'),parseRecipeIngredient('1 onion')]}];
  const rows=buildShoppingRows([{recipeId:'r1',portions:4},{recipeId:'r1',portions:2}],recipes,[]);
  assert.equal(rows.length,2);
  assert.equal(rows.find(row=>row.food==='pasta').amount,600);
  assert.equal(rows.find(row=>row.food==='onion').amount,3);
});

test('does not request ingredients listed in the kitchen', () => {
  const recipes=[{id:'r1',yield:2,ingredients:[parseRecipeIngredient('200 g pasta'),parseRecipeIngredient('1 onion')]}];
  const rows=buildShoppingRows([{recipeId:'r1',portions:2}],recipes,['pasta']);
  assert.deepEqual(rows.map(row=>row.food),['onion']);
});

test('the four meal planner tabs change the active view and rerender', async () => {
  const originalDocument=globalThis.document;globalThis.document={addEventListener(){}};
  try{
    const state={entries:{}};let renders=0,saves=0;
    const planner=createMealPlanner({getState:()=>state,save:()=>saves++,render:()=>renders++,esc:String,makeId:()=>`id-${saves}`,toast:()=>{}});
    for(const view of ['cookbook','week','kitchen','shopping']){
      assert.equal(await planner.handle({mpView:view}),true);
      assert.equal(JSON.parse(state.entries['meal-planner:data']).view,view);
    }
    assert.equal(renders,4);
    assert.equal(saves,4);
  }finally{globalThis.document=originalDocument;}
});

test('only the same titled recipe at the same page is reported as a duplicate', () => {
  const first={title:'Roast tomato pasta',sourceUrl:'https://recipes.example/pasta?utm_source=newsletter'};
  assert.equal(isDuplicateRecipe(first,{title:'Roast tomato pasta',sourceUrl:'https://recipes.example/pasta#ingredients'}),true);
  assert.equal(isDuplicateRecipe(first,{title:'Lemon chickpea stew',sourceUrl:'https://recipes.example/pasta'}),false);
  assert.equal(isDuplicateRecipe(first,{title:'Roast tomato pasta',sourceUrl:'https://recipes.example/similar'}),false);
});
