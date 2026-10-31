import assert from 'node:assert/strict';
import {test} from 'node:test';
import {changeTechnicianPassword} from '../lib/admin-password.ts';
const admin={id:'00000000-0000-0000-0000-000000000001',role:'admin'};
const tech='00000000-0000-0000-0000-000000000002';
const password='Test-only-passphrase!';
test('password changes reject unauthenticated and technician callers before accessing privileged backend',async()=>{
 const backend={technicianRole:()=>assert.fail('must not read account'),updatePassword:()=>assert.fail('must not change password')};
 for(const actor of [null,{...admin,role:'technician'}])await assert.rejects(()=>changeTechnicianPassword(actor,tech,password,backend),e=>e.status===401||e.status===403);
});
test('password changes cannot target admins, absent users, or the current admin',async()=>{
 for(const role of ['admin',null])await assert.rejects(()=>changeTechnicianPassword(admin,tech,password,{technicianRole:async()=>role,updatePassword:()=>assert.fail('must not change password')}),e=>e.status===404);
 await assert.rejects(()=>changeTechnicianPassword(admin,admin.id,password,{technicianRole:()=>assert.fail(),updatePassword:()=>assert.fail()}),e=>e.status===400);
});
test('invalid password and identity never reach Auth',async()=>{
 const backend={technicianRole:()=>assert.fail(),updatePassword:()=>assert.fail()};
 for(const value of ['',null,{},'short','x'.repeat(129)])await assert.rejects(()=>changeTechnicianPassword(admin,tech,value,backend),e=>e.status===400);
 await assert.rejects(()=>changeTechnicianPassword(admin,'invalid',password,backend),e=>e.status===400);
});
test('authorized password update targets only the selected technician and does not return credentials',async()=>{
 const updates=[];
 const result=await changeTechnicianPassword(admin,tech,password,{technicianRole:async id=>{assert.equal(id,tech);return 'technician'},updatePassword:async(id,pwd)=>{updates.push({id,pwd})}});
 assert.deepEqual(updates,[{id:tech,pwd:password}]);assert.equal(result,undefined);
});
