'use strict'
const fs=require('fs'),path=require('path'),pr=path.join(__dirname,'..'),dr=path.join(pr,'product/lead-response/dashboard')
describe('Admin pilot invite flow',()=>{
  test('invite-pilot route exists',()=>{expect(fs.existsSync(path.join(dr,'app/api/admin/invite-pilot/route.ts'))).toBe(true)})
  test('invite-pilot has admin auth',()=>{expect(fs.readFileSync(path.join(dr,'app/api/admin/invite-pilot/route.ts'),'utf8')).toMatch(/X-Admin-Token|ADMIN_SECRET/)})
  test('accept-invite page exists',()=>{expect(fs.existsSync(path.join(dr,'app/accept-invite/page.tsx'))).toBe(true)})
  test('accept-invite has Suspense',()=>{const c=fs.readFileSync(path.join(dr,'app/accept-invite/page.tsx'),'utf8');expect(c).toMatch(/Suspense/);expect(c).toMatch(/useSearchParams/)})
  test('accept-invite uses pilot_invites',()=>{expect(fs.readFileSync(path.join(dr,'app/api/auth/accept-invite/route.ts'),'utf8')).toMatch(/pilot_invites/)})
  test('pilot_invites migration exists',()=>{const p=path.join(pr,'migrations/014_pilot_invites.sql');expect(fs.existsSync(p)).toBe(true);expect(fs.readFileSync(p,'utf8')).toMatch(/CREATE TABLE/)})
  test('/admin/invite page exists',()=>{expect(fs.existsSync(path.join(dr,'app/admin/invite/page.tsx'))).toBe(true)})
})
