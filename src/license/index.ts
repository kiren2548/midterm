import { Hono } from "hono";
import * as z from 'zod'
import { zValidator } from '@hono/zod-validator'
import db from '../db/index.js'
import { error } from "console";

const licenseRoutes = new Hono()
type license = {
    licenseID: number
    type: string
    expiryDate: string
    lssueData: string
    licensenumber: string


}

licenseRoutes.get('/', async (c) => {
    let sql = 'SELECT *FROM license'
    let stmt = db.prepare(sql)
    let license = await stmt.all()

    return c.json({ message: 'list of license', data:license })
})

licenseRoutes.get('/:id', (c) => {
    const { id } = c.req.param()
    let sql = 'SELECT * FROM license WHERE id =@id'
    let stmt = db.prepare<{ id: string },license>(sql)
    let license = stmt.get({ id: id })

    if (!license) {
        return c.json({ message: 'license not found' }, 404)
    }
    return c.json({
        message: `list of license for id: ${id}`,
        data: license
    })
})

const createdlicenseShema = z.object({
    type: z.string("กรุณากรอกประเภทรถ"),
    expiryDate: z.string("กรุณากรอกวันที่หมดอายุใบขับขี่"),
    lssueData: z.string("กรุณากรอกวันที่ออกใบชับชี่"),
    licensenumber: z.string("กรุณากรอกหมายเลขทะเบียนรถ").length(7, "ชื่อทะเบียนรถต้องมีความยาวอย่าง 7 ตัวอักษร"),


})

licenseRoutes.post('/', zValidator('json', createdlicenseShema, (result, c) => {
    if (!result.success) {
        return c.json({
            message: 'validation failed',
            errors: result.error.issues
        }, 400)
    }
}), async (c) => {
    const body = await c.req.json()
    let sql = `INSERT INTO license
( type, expiryDate, lssueData, licensenumber)
VALUES(@type, @expiryDate, @lssueData, @licensenumber);`
    let stmt = db.prepare<Omit<license, "id">>(sql)
    let result = stmt.run(body)

    if (result.changes === 0) {
        return c.json({ message: 'failed to creste license' }, 500)
    }
    let lestRowid = result.lastInsertRowid as number

    let sql2 = 'SELECT * FROM license WHERE id = ?'
    let stmt2 = db.prepare<[number], license>(sql2)
    let newlicense = stmt2.get(lestRowid)
    return c.json({ message: 'license created', data: newlicense }, 201)
})

licenseRoutes.put(
    '/:id',
    zValidator('json', createdlicenseShema, (result, c) => {
        if (!result.success)
            return c.json({ message: 'Validation failed', errors: result.error.issues }, 400);
    }),
    async (c) => {
        const { id } = c.req.param();
        const body = await c.req.json();

        const sqlCheck = 'SELECT * FROM license WHERE id = @id';
        const stmtCheck = db.prepare<{ id: string }, license>(sqlCheck);
        const existinglicense = stmtCheck.get({ id });
        if (!existinglicense) return c.json({ message: 'license not found' }, 404);

        const sql = `
      UPDATE license
SET "type"=@type, expiryDate=@expiryDate, lssueData=@lssueData, licensenumber=@lssueData
WHERE licenseID=@id;
    `;
        const stmt = db.prepare<Omit<license, 'id'> & { id: string }>(sql);
        const result = stmt.run({ ...body, id });

        if (result.changes === 0) return c.json({ message: 'Failed to update license' }, 500);

        const updatedlicense = stmtCheck.get({ id });
        return c.json({ message: 'license updated', data: updatedlicense });
    }
);
licenseRoutes.delete('/:id', (c) => {
    const { id } = c.req.param();
    const sqlCheck = 'SELECT * FROM license WHERE id=@id';
    const stmtCheck = db.prepare<{ id: string }, license>(sqlCheck);
    const existinglicense = stmtCheck.get({ id });
    if (!existinglicense) return c.json({ message: 'license not found' }, 404);

    const sql = 'DELETE FROM license WHERE id=@id';
    const stmt = db.prepare<{ id: string }>(sql);
    stmt.run({ id });

    return c.json({ message: `license id= ${id} deleted successfully` });
});
export default licenseRoutes