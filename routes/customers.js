/**
 * Customer Management API Routes
 * CRUD operations for paying customers (real estate agents)
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * POST /api/customers
 * Create a new customer
 * Body: { email, name, phone, company, plan_tier }
 */
router.post('/', async (req, res) => {
  try {
    const { email, name, phone, company, plan_tier } = req.body;

    // Validation
    if (!email || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Check if customer already exists
    const { data: existing } = await supabase
      .from('customers')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'Customer already exists',
        customerId: existing.id
      });
    }

    // Create customer record
    const { data: customer, error: dbError } = await supabase
      .from('customers')
      .insert({
        email,
        name,
        phone,
        company,
        plan_tier,
        status: 'trialing'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        error: 'Failed to create customer',
        message: dbError.message
      });
    }

    console.log('✅ Created customer:', customer.id);

    res.status(201).json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        company: customer.company,
        plan_tier: customer.plan_tier,
        status: customer.status,
        created_at: customer.created_at
      }
    });

  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      error: 'Failed to create customer',
      message: error.message
    });
  }
});

/**
 * GET /api/customers/:customerId
 * Get customer by ID
 */
router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error || !customer) {
      return res.status(404).json({
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      customer
    });

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      error: 'Failed to get customer',
      message: error.message
    });
  }
});

/**
 * GET /api/customers
 * List all customers (admin only)
 * Query params: limit, offset, status, plan_tier
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, plan_tier } = req.query;

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (plan_tier) {
      query = query.eq('plan_tier', plan_tier);
    }

    const { data: customers, error, count } = await query;

    if (error) {
      console.error('List customers error:', error);
      return res.status(500).json({
        error: 'Failed to list customers',
        message: error.message
      });
    }

    res.json({
      success: true,
      customers,
      count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('List customers error:', error);
    res.status(500).json({
      error: 'Failed to list customers',
      message: error.message
    });
  }
});

/**
 * PATCH /api/customers/:customerId
 * Update customer profile
 * Body: { name, phone, company }
 */
router.patch('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { name, phone, company } = req.body;

    // Build update object with only provided fields
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (company !== undefined) updates.company = company;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No fields to update'
      });
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Update customer error:', error);
      return res.status(500).json({
        error: 'Failed to update customer',
        message: error.message
      });
    }

    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      customer
    });

  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      error: 'Failed to update customer',
      message: error.message
    });
  }
});

/**
 * POST /api/customers/:customerId/stripe-customer
 * Create Stripe customer for an existing customer record
 */
router.post('/:customerId/stripe-customer', async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!stripe) {
      return res.status(503).json({
        error: 'Stripe not configured'
      });
    }

    // Get customer from database
    const { data: customer, error: dbError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (dbError || !customer) {
      return res.status(404).json({
        error: 'Customer not found'
      });
    }

    if (customer.stripe_customer_id) {
      return res.status(409).json({
        error: 'Stripe customer already exists',
        stripe_customer_id: customer.stripe_customer_id
      });
    }

    // Create Stripe customer
    const stripeCustomer = await stripe.customers.create({
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      metadata: {
        leadflow_customer_id: customerId,
        company: customer.company || ''
      }
    });

    // Update database with Stripe customer ID
    const { data: updated, error: updateError } = await supabase
      .from('customers')
      .update({
        stripe_customer_id: stripeCustomer.id
      })
      .eq('id', customerId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update customer with Stripe ID:', updateError);
      return res.status(500).json({
        error: 'Failed to update customer record',
        message: updateError.message
      });
    }

    console.log('✅ Created Stripe customer:', stripeCustomer.id, 'for', customerId);

    res.json({
      success: true,
      customer: updated,
      stripe_customer_id: stripeCustomer.id
    });

  } catch (error) {
    console.error('Create Stripe customer error:', error);
    res.status(500).json({
      error: 'Failed to create Stripe customer',
      message: error.message
    });
  }
});

/**
 * DELETE /api/customers/:customerId
 * Delete customer (soft delete - sets status to 'canceled')
 */
router.delete('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    // Soft delete: update status instead of deleting row
    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Delete customer error:', error);
      return res.status(500).json({
        error: 'Failed to delete customer',
        message: error.message
      });
    }

    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer canceled',
      customer
    });

  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      error: 'Failed to delete customer',
      message: error.message
    });
  }
});

module.exports = router;
