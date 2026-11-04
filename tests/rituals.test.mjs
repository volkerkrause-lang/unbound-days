import test from 'node:test';
import assert from 'node:assert/strict';
import {isScheduled,isComplete,ritualProgress,currentStreak,toggleCompletion} from '../rituals.js';

test('daily, weekday, weekend and custom schedules use local calendar weekdays',()=>{
 assert.equal(isScheduled({frequency:'daily'},'2026-11-04'),true); // Wednesday
 assert.equal(isScheduled({frequency:'weekdays'},'2026-11-07'),false);
 assert.equal(isScheduled({frequency:'weekends'},'2026-11-07'),true);
 assert.equal(isScheduled({frequency:'custom',days:[0,2]},'2026-11-04'),true);
 assert.equal(isScheduled({frequency:'custom',days:[0,2]},'2026-11-05'),false);
 assert.equal(isScheduled({frequency:'daily',startDate:'2026-11-05'},'2026-11-04'),false);
});

test('progress excludes unscheduled days from its denominator',()=>{
 const ritual={frequency:'weekdays',checks:['2026-11-02','2026-11-03','2026-11-07']};
 assert.deepEqual(ritualProgress(ritual,'2026-11-02','2026-11-08'),{scheduled:5,completed:2,percent:40,dates:['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06']});
});

test('completion is per date and never records unscheduled days',()=>{
 const ritual={frequency:'weekends',checks:[]};
 assert.equal(toggleCompletion(ritual,'2026-11-04'),false);
 assert.deepEqual(ritual.checks,[]);
 assert.equal(toggleCompletion(ritual,'2026-11-07'),true);
 assert.deepEqual(ritual.checks,['2026-11-07']);
 assert.equal(toggleCompletion(ritual,'2026-11-07'),true);
 assert.deepEqual(ritual.checks,[]);
});

test('legacy habit checks remain visible and explicit completion changes can uncheck without erasing history',()=>{
 const legacy={id:'old',title:'Walk',checks:['2026-11-02']};
 assert.equal(isComplete(legacy,'2026-11-02'),true);
 toggleCompletion(legacy,'2026-11-02','2026-11-04T12:00:00.000Z','device-a');
 assert.deepEqual(legacy.checks,[]);
 assert.equal(isComplete(legacy,'2026-11-02'),false);
 assert.equal(legacy.completionChanges['2026-11-02'].done,false);
});

test('streaks count scheduled completions and skip unscheduled dates',()=>{
 const ritual={frequency:'weekdays',checks:['2026-11-02','2026-11-03','2026-11-04']};
 assert.equal(currentStreak(ritual,'2026-11-04'),3);
 assert.equal(currentStreak(ritual,'2026-11-05'),3);
});
