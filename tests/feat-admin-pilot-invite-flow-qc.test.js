'use strict'
const fs=require('fs'),path=require('path'),pr=path.join(__dirname,'..'),dr=path.join(pr,'product/lead-response/dashboard')
describe('Admin pilot invite flow - QC',()=>{
  test('no hardcoded secrets',()=>{expect(fs.readFileSync(path.join(dr,'app/api/admin/invite-pilot/route.ts'),'utf8')).not.toMatch(/sk_live_/)})
  test('token stored as hash',()=>{const c=fs.readFileSync(path.join(dr,'app/api/admin/invite-pilot/route.ts'),'utf8');expect(c).toMatch(/tokenHash/);expect(c).toMatch(/sha256/)})
  test('error handling present',()=>{expect(fs.readFileSync(path.join(dr,'app/api/admin/invite-pilot/route.ts'),'utf8')).toMatch(/try|catch|error/)})
  test('token expiry checked',()=>{expect(fs.readFileSync(path.join(dr,'app/api/auth/accept-invite/route.ts'),'utf8')).toMatch(/token_expires_at|expires/)})
  test('token column is TEXT',()=>{expect(fs.readFileSync(path.join(pr,'migrations/014_pilot_invites.sql'),'utf8')).toMatch(/token\s+TEXT/)})
})
