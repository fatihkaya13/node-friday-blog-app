const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const schemas = require('../validations/Readinglists');
const idChecker = require('../middlewares/idChecker');

const {
    index,
    getReadinglist,
    createReadinglist,
    updateReadinglist,
    deleteReadinglist,
    addBlogToReadinglist,
    removeBlogFromReadingList,
} = require('../controllers/Readinglists');

const router = express.Router();

router.route('/').get(authenticate, index);
router.route('/:id').get(idChecker, authenticate, getReadinglist);
router
    .route('/')
    .post(authenticate, validate(schemas.createValidation), createReadinglist);
router
    .route('/:id')
    .patch(
        idChecker,
        authenticate,
        validate(idChecker, schemas.updateValidation),
        updateReadinglist
    );
router
    .route('/:id/add-blog/:blogId')
    .patch(
        idChecker,
        authenticate,
        validate(schemas.updateValidation),
        addBlogToReadinglist
    );
router
    .route('/:id/remove-blog/:blogId')
    .patch(
        idChecker,
        authenticate,
        validate(schemas.updateValidation),
        removeBlogFromReadingList
    );
router.route('/:id').delete(idChecker, authenticate, deleteReadinglist);

module.exports = router;
