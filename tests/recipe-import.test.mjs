import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRecipeFromHtml } from '../functions/api/recipe-import.js';

test('extracts a Recipe nested in an @graph and converts cooking metadata', () => {
  const json={"@context":"https://schema.org","@graph":[{"@type":"WebPage","name":"Recipe page"},{"@type":"Recipe","name":"Tomato pasta","recipeIngredient":["200 g pasta","2 tomatoes"],"prepTime":"PT10M","cookTime":"PT20M","recipeYield":"Serves 4","recipeInstructions":[{"@type":"HowToStep","text":"Boil the pasta."},{"@type":"HowToStep","text":"Cook the tomatoes."}],"image":{"@type":"ImageObject","url":"https://food.example/pasta.jpg"}}]};
  const html=`<script type="application/ld+json">${JSON.stringify(json)}</script>`;
  const result=extractRecipeFromHtml(html,'https://food.example/tomato-pasta');
  assert.equal(result.recipe.title,'Tomato pasta');
  assert.equal(result.recipe.prepTime,10);
  assert.equal(result.recipe.cookTime,20);
  assert.equal(result.recipe.yield,4);
  assert.deepEqual(result.recipe.instructions,['Boil the pasta.','Cook the tomatoes.']);
  assert.equal(result.recipe.image,'https://food.example/pasta.jpg');
});

test('ignores malformed or non-recipe JSON-LD and leaves unsupported pages for manual entry', () => {
  const html='<script type="application/ld+json">{bad json</script><script type="application/ld+json">{"@type":"Article","name":"Not a recipe"}</script>';
  assert.equal(extractRecipeFromHtml(html,'https://food.example/article'),null);
});

test('rejects unsafe image schemes from structured data', () => {
  const json={"@type":"Recipe","name":"Soup","recipeIngredient":["salt"],"image":"javascript:alert(1)"};
  const html=`<script type="application/ld+json">${JSON.stringify(json)}</script>`;
  assert.equal(extractRecipeFromHtml(html,'https://food.example/soup').recipe.image,'');
});
