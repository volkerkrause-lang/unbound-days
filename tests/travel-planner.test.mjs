import test from 'node:test';
import assert from 'node:assert/strict';
import {create,ensure} from '../travel-planner.js';
import {parseBookingText,parseDistinctBookingPages} from '../travel-document-parser.js';

function setup(){
 const state={travel:ensure({trips:[{id:'trip-1',name:'Rome',destination:'Rome',sections:{},currency:'GBP'}],bookings:[],checklists:[{id:'before-1',tripId:'trip-1',title:'Before Rome',kind:'before',formKey:'before-form'}],ideaLinks:[],budgetEntries:[],attachments:[]}),entries:{}};
 let modal=null;const planner=create({getState:()=>state,save(){},render(){},openModal:(title,html)=>modal={title,html},closeModal(){},toast(){},ideas:()=>[],packing:{setView(){}},google:{connected:()=>false},cloud:{}});
 return {state,planner,get modal(){return modal;}};
}

test('trip workspace omits Before You Go and retains saved ideas, budget and linked checklist data',()=>{
 const {planner}=setup();planner.handle({travelOpen:'trip-1'});
 const html=planner.render();
 assert.doesNotMatch(html,/>Before You Go</);
 assert.match(html,/Saved ideas/);assert.match(html,/>Budget</);assert.match(html,/Before Rome/);
});

test('booking form has no required booking name or timezone and offers route and cloud upload fields',()=>{
 const fixture=setup(),{planner}=fixture;planner.handle({travelOpen:'trip-1'});planner.handle({travelAddBooking:'trip-1'});
 const html=fixture.modal.html;
 assert.doesNotMatch(html,/Booking name|Time zone/);
 assert.match(html,/name="departureLocation"/);assert.match(html,/name="arrivalLocation"/);
 assert.match(html,/application\/pdf/);assert.match(html,/\.jpg,.jpeg,.png/);assert.match(html,/Reservation reference/);assert.match(html,/travel-booking-file-status/);
});

test('booking titles are generated from type and route without a user-entered title',async()=>{
 const {planner,state}=setup();planner.handle({travelOpen:'trip-1'});
 const form={id:'travel-booking',dataset:{tripId:'trip-1',id:''}};
 await planner.submit(form,{type:'Flight',departureLocation:'London Heathrow',arrivalLocation:'Rome Fiumicino',date:'2026-12-01',time:'09:00',endDate:'',endTime:'',location:'',reference:'AB123'});
 assert.equal(state.travel.bookings[0].title,'Flight — London Heathrow to Rome Fiumicino');
 assert.equal(state.travel.bookings[0].reference,'AB123');
});


test('document parser extracts labelled booking details without guessing missing values',()=>{
 const result=parseBookingText('Flight confirmation\nAirline: British Airways\nFlight number: BA 281\nFrom: London Heathrow\nTo: Los Angeles International\nDeparture date: 14/12/2026\nDeparture time: 08:20\nBooking reference: ABC123');
 assert.equal(result.type,'Flight');assert.equal(result.fields.name,'British Airways');assert.equal(result.fields.flightNumber,'BA 281');
 assert.equal(result.fields.departureLocation,'London Heathrow');assert.equal(result.fields.arrivalLocation,'Los Angeles International');
 assert.equal(result.fields.date,'2026-12-14');assert.equal(result.fields.time,'08:20');assert.equal(result.fields.reference,'ABC123');
 const empty=parseBookingText('Travel confirmation');assert.equal(empty.type,'');assert.equal(empty.fields.date,undefined);assert.equal(empty.fields.reference,'');
});

test('document parser handles labelled accommodation and restaurant bookings',()=>{
 const hotel=parseBookingText('Hotel confirmation\nHotel: Hotel Arno\nAddress: Lungarno 1, Florence\nCheck-in: 2026-07-02\nCheck-out: 2026-07-06\nConfirmation number: H98765');
 assert.equal(hotel.type,'Accommodation');assert.equal(hotel.fields.name,'Hotel Arno');assert.equal(hotel.fields.location,'Lungarno 1, Florence');assert.equal(hotel.fields.date,'2026-07-02');assert.equal(hotel.fields.endDate,'2026-07-06');assert.equal(hotel.fields.reference,'H98765');
 const meal=parseBookingText('Restaurant reservation\nRestaurant: Trattoria Bella\nAddress: Via Roma 4\nDate: 2026-07-03\nReservation time: 19:30');
 assert.equal(meal.type,'Restaurant');assert.equal(meal.fields.name,'Trattoria Bella');assert.equal(meal.fields.location,'Via Roma 4');assert.equal(meal.fields.time,'19:30');
});

test('document parser recognises train operator, route and service number',()=>{
 const result=parseBookingText('Train ticket\nOperator: Trenitalia\nTrain number: FR 9560\nDeparture station: Roma Termini\nArrival station: Firenze S. M. Novella\nDate: 2026-07-04\nDeparture time: 10:15\nArrival time: 11:46');
 assert.equal(result.type,'Train');assert.equal(result.fields.name,'Trenitalia');assert.equal(result.fields.departureLocation,'Roma Termini');assert.equal(result.fields.arrivalLocation,'Firenze S. M. Novella');assert.equal(result.fields.time,'10:15');assert.equal(result.fields.endTime,'11:46');
});


test('multi-page confirmations offer distinct booking entries and suppress duplicate pages',()=>{
 const pages=[
  {text:'Flight confirmation\nAirline: Example Air\nFrom: London Heathrow\nTo: Rome Fiumicino\nDate: 2026-07-10\nDeparture time: 08:00\nBooking reference: AA1234'},
  {text:'Flight confirmation\nAirline: Example Air\nFrom: Rome Fiumicino\nTo: London Heathrow\nDate: 2026-07-15\nDeparture time: 16:30\nBooking reference: BB5678'},
  {text:'Duplicate copy\nAirline: Example Air\nFrom: London Heathrow\nTo: Rome Fiumicino\nDate: 2026-07-10\nDeparture time: 08:00\nBooking reference: AA1234'}
 ];
 const entries=parseDistinctBookingPages(pages);assert.equal(entries.length,2);assert.equal(entries[0].fields.reference,'AA1234');assert.equal(entries[1].fields.reference,'BB5678');
});

test('Travel Planner starts with country search and keeps the existing trips visible',()=>{
 const {planner}=setup(),html=planner.render();
 assert.match(html,/Where would you like to go\?/);assert.match(html,/travel-country-list/);
 assert.match(html,/Explore Destinations/);assert.match(html,/My Trips/);
});

test('country research uses stable country codes and records recently viewed destinations',async()=>{
 const {planner,state}=setup();await planner.handle({travelCountry:'IT'});
 assert.match(planner.render(),/Explore Italy/);assert.deepEqual(state.travel.recentCountries,['IT']);
 assert.match(planner.render(),/Lonely Planet/);assert.match(planner.render(),/Google Flights/);
});

test('saved research is private notebook state and supports status updates',async()=>{
 const {planner,state}=setup();await planner.handle({travelCountry:'IT'});
 await planner.submit({id:'travel-research-form',dataset:{researchId:'',countryCode:'IT'}},{title:'A place to stay',url:'https://example.com/stay',category:'Accommodation',notes:'Ask about late check-in'});
 const item=state.travel.researchItems[0];assert.equal(item.countryCode,'IT');assert.equal(item.status,'Interested');
 await planner.handle({travelResearchStatus:item.id,value:'Shortlisted'});assert.equal(item.status,'Shortlisted');
});

test('an opened trip remains selected while notebook sync temporarily restores its record',async()=>{
 const {planner,state}=setup();state.travel.trips=[];await planner.handle({travelOpen:'trip-1'});
 assert.equal(planner.getSelected(),'trip-1');assert.match(planner.render(),/Restoring your saved trip/);
 state.travel.trips.push({id:'trip-1',name:'Rome',destination:'Rome',sections:{}});
 assert.match(planner.render(),/Rome/);assert.equal(planner.getSelected(),'trip-1');
});
