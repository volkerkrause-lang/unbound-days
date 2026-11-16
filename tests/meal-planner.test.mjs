import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShoppingRows, parseRecipeIngredient } from '../meal-planner.js';

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
