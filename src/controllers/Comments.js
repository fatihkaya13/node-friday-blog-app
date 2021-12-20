const {
    insert,
    modify,
    list,
    listById,
    remove,
} = require('../services/Comments');

const { listById: getBlogById } = require('../services/Blogs');

const httpStatus = require('http-status');

const ApiError = require('../errors/ApiError');

const index = (req, res, next) => {
    // console.log(req.user)
    list()
        .then((response) => {
            res.status(httpStatus.OK).send(response);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const getComment = (req, res, next) => {

    listById(req.params?.id)
        .then((response) => {
            res.status(httpStatus.OK).send(response);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const createComment = (req, res, next) => {
    // get user info from auth middleware
    const { _id, full_name } = req.userInfo;

    // add user_id and full_name to request body JSON
    req.body.user_id = _id;
    req.body.author = full_name;

    // check if blog exists in the db
    getBlogById(req.body.blog_id)
        .then((blog) => {
            if (!blog)
            return next(
                new ApiError('Blog is not found', httpStatus.NOT_FOUND)
            );
            insert(req.body)
                .then((response) => {
                    res.status(httpStatus.CREATED).send(response);
                })
                .catch((e) => {
                    next(new ApiError(e.message));
                });
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const updateComment = (req, res) => {

    modify(req.body, req.params?.id)
        .then((updatedComment) => {
            res.status(httpStatus.OK).send(updatedComment);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const deleteComment = (req, res) => {


    remove(req.params?.id)
        .then((deletedComment) => {
            console.log('deleted Comment >> ', deletedComment);
            if (!deletedComment) {
                return next(
                    new ApiError('Comment cannot be found', httpStatus.NOT_FOUND)
                );
            }
            res.status(httpStatus.OK).send({
                message: 'Comment is removed.',
            });
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

module.exports = {
    index,
    getComment,
    createComment,
    updateComment,
    deleteComment,
    // deleteCommentForBlog
};
