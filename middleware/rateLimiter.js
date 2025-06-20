import ratelimit from "../config/upstash.js";

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    // const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const {success} = await ratelimit.limit("my-rate-limit");

    if (!success) {
      return res.status(429).json({ error: 'Too many requests, please try again later.' });
    }

    next();
  } catch (error) {
    console.log('Rate limiter error:', error)
    next(error)
  }
};
export default rateLimiterMiddleware;