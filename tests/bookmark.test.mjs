import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('cover bookmark ribbon uses red velvet gradient and text shadow instead of green', () => {
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

  // Check that green ribbon colors are no longer present
  assert.equal(css.includes('#273f36'), false, 'styles.css should not contain green ribbon color #273f36');
  assert.equal(css.includes('#8aab8d'), false, 'styles.css should not contain green ribbon color #8aab8d');
  assert.equal(css.includes('#4e745e'), false, 'styles.css should not contain green ribbon color #4e745e');
  assert.equal(css.includes('#8cab85'), false, 'styles.css should not contain green ribbon color #8cab85');
  assert.equal(css.includes('#263d32'), false, 'styles.css should not contain green ribbon color #263d32');
  assert.equal(css.includes('#263c24'), false, 'styles.css should not contain green ribbon color #263c24');

  // Check that red velvet gradient and text shadow are present for .ribbon
  assert.ok(
    css.includes('linear-gradient(90deg,#3e070c,#a82231 12%,#78121f 48%,#b82939 82%,#38050a)'),
    'styles.css should contain red velvet ribbon background gradient'
  );
  assert.ok(
    css.includes('text-shadow:0 -1px 0 #fff5,0 1px 1px #38050a'),
    'styles.css should contain red velvet ribbon text shadow'
  );

  // Check that inside bookmark ribbon (.bookmark-today) uses two peaks (inward notch polygon) matching the outer ribbon
  assert.equal(
    css.includes('clip-path:polygon(50% 0,100% 14%,100% 100%,0 100%,0 14%)'),
    false,
    'styles.css should not use single-peak clip-path for .bookmark-today'
  );
  assert.ok(
    css.includes('.bookmark-today{clip-path:polygon(0 0,100% 0,100% 100%,50% 88%,0 100%)'),
    'styles.css should use two-peak clip-path with bottom notch for .bookmark-today'
  );
});
