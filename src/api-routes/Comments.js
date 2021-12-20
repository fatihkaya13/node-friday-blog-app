const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const schemas = require('../validations/Comments');
const idChecker = require('../middlewares/idChecker');

const {
    index,
    getComment,
    createComment,
    updateComment,
    deleteComment,
} = require('../controllers/Comments');

const router = express.Router();

router.route('/').get(index);
router.route('/:id').get(idChecker, authenticate, getComment);
router
    .route('/')
    .post(authenticate, validate(schemas.createValidation), createComment);
router
    .route('/:id')
    .patch(
        authenticate,
        validate(idChecker, schemas.updateValidation),
        updateComment
    );
router.route('/:id').delete(idChecker, authenticate, deleteComment);

module.exports = router;
