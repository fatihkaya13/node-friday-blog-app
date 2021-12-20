const express = require('express');
const validate = require('../middlewares/validate');
const authenticate = require('../middlewares/authenticate');
const schemas = require('../validations/Blogs');

const {
    index,
    getBlog,
    getPopularBlogs,
    getPopularBlogsByCategory,
    getRecommendedBlogsForUser,
    searchBlogsByKeywords,
    createBlog,
    updateBlog,
    deleteBlog,
    sendLikeFlag,
} = require('../controllers/Blogs');

const idChecker = require('../middlewares/idChecker');

const router = express.Router();

router.route('/').get(index);
router.route('/popular-blogs').get(getPopularBlogs);
router.route('/popular-blogs/:category').get(getPopularBlogsByCategory);
router
    .route('/search-by-keywords')
    .get(
        validate(schemas.searchBlogsByKeywordsValidation),
        searchBlogsByKeywords
    );
router.route('/recommend-me').get(authenticate, getRecommendedBlogsForUser);
router.route('/:id').get(idChecker, authenticate, getBlog);
router
    .route('/')
    .post(authenticate, validate(schemas.createValidation), createBlog);
router
    .route('/:id')
    .patch(
        idChecker,
        authenticate,
        validate(schemas.updateValidation),
        updateBlog
    );
router
    .route('/:id/like-flag')
    .patch(
        idChecker,
        authenticate,
        validate(schemas.sendLikeFlagValidation),
        sendLikeFlag
    );
router.route('/:id').delete(idChecker, authenticate, deleteBlog);

module.exports = router;
