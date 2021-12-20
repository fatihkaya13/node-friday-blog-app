const {
    insert,
    modify,
    list,
    listById,
    listPopularBlogs,
    listPopularBlogsByCategory,
    listRecommendedBlogsForUser,
    listBlogsByGivenWords,
    remove,
    incrementLike,
    decrementLike,
} = require('../services/Blogs');

const {
    getCommentsForBlog,
    removeCommentsForBlogId,
} = require('../services/Comments');

const { listReadingListsByBlogId } = require('../services/Readinglists');

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

const getBlog = (req, res, next) => {
    listById(req.params?.id)
        .then((response) => {
            res.status(httpStatus.OK).send(response);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const getPopularBlogs = (req, res, next) => {
    listPopularBlogs()
        .then((response) => {
            res.status(httpStatus.OK).send(response);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const getPopularBlogsByCategory = (req, res, next) => {
    listPopularBlogsByCategory(req.params.category)
        .then((response) => {
            res.status(httpStatus.OK).send(response);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const getRecommendedBlogsForUser = (req, res, next) => {
    listRecommendedBlogsForUser(req.userInfo.preferredHashtags)
        .then((response) => {
            res.status(httpStatus.OK).send(response);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

// this query performs a search operation for each text field in blog collection
const searchBlogsByKeywords = (req, res, next) => {
    if (!req.body?.keywords) {
        return next(
            new ApiError(
                "Keywords are missing. Please write keywords with a space between such as 'coffee newyork'",
                httpStatus.BAD_REQUEST
            )
        );
        /*
        return res.status(httpStatus.BAD_REQUEST).send({
            message:
                "Keywords are missing. Please write keywords with a space between such as 'coffee newyork'",
        }); */
    }

    listBlogsByGivenWords(req.body.keywords)
        .then((response) => {
            res.status(httpStatus.OK).send(response);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const createBlog = (req, res, next) => {
    // get user info from auth middleware
    const { _id, full_name } = req.userInfo;

    // add user_id and full_name to request body JSON
    req.body.user_id = _id;
    req.body.author = full_name;

    console.log(req.body);
    // insert body so we know which user has posted the blog
    insert(req.body)
        .then((response) => {
            res.status(httpStatus.CREATED).send(response);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const updateBlog = (req, res) => {
    modify(req.body, req.params?.id)
        .then((updatedBlog) => {
            res.status(httpStatus.OK).send(updatedBlog);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const deleteBlog = (req, res, next) => {
    //  remove comments for blog
    // TODOS: write leaner implementation
    getCommentsForBlog(req.params)
        .then((existingComments) => {
            if (existingComments) {
                removeCommentsForBlogId(req.params)
                    .then((removedComments) => {
                        console.log(
                            `${removedComments.deletedCount} comments are removed`
                        );
                    })
                    .catch((e) => {
                        next(new ApiError(e.message));
                    });
            }
            console.log(
                `Comments for blog id: ${req.params.id} are safely removed.`
            );
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });

    // remove blogs from reading lists
    listReadingListsByBlogId(req.params.id)
        .then((readingLists) => {
            console.log(readingLists);
            // loop through each reading list
            readingLists.forEach((list) => {
                // filter each reading list so that deleted blog does not exists in blogs array
                list.blogs = list.blogs.filter(
                    (elem) => elem.blog_id?.toString() !== req.params.id
                );
                // save to db
                list.save().then((s) => {
                    console.log(s);
                });
            });
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });

    // remove blog
    remove(req.params?.id)
        .then((deletedBlog) => {
            console.log('deleted blog >> ', deletedBlog);
            if (!deletedBlog) {
                return next(
                    new ApiError('Blog cannot be found', httpStatus.NOT_FOUND)
                );
            }
            res.status(httpStatus.OK).send({
                message: 'Blog is removed.',
            });
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const sendLikeFlag = (req, res, next) => {
    // get user info from auth middleware
    // get like flag from request body
    const { liked } = req.body;
    const { _id } = req.userInfo;

    //TODOS: refactoring into single units required !!!

    if (liked) {
        // find blog
        listById(req.params?.id)
            .then((blog) => {
                if (!blog)
                    return next(
                        new ApiError(
                            'Blog cannot be found',
                            httpStatus.NOT_FOUND
                        )
                    );

                // check if user liked this blog before
                const isUserLikedThisBlogBefore = blog.likedByUsers.find(
                    (elem) => elem.user_id?.toString() === _id
                );
                if (isUserLikedThisBlogBefore)
                    return res.status(httpStatus.OK).send({
                        message: 'Current user has already liked this blog',
                    });

                // create object to add array
                const likedByUser = {
                    // get user info from auth middleware
                    user_id: _id,
                };
                // add blog model likedByUsers field that holds array of objects to current user who likes the blog now
                blog.likedByUsers.push(likedByUser);
                // save document
                blog.save()
                    .then((updatedDoc) => {
                        // increment num of likes
                        incrementLike(updatedDoc._id)
                            .then((updatedBlog) => {
                                res.status(httpStatus.OK).send(updatedBlog);
                            })
                            .catch((e) => {
                                next(new ApiError(e.message));
                            });
                    })
                    .catch((e) => {
                        next(new ApiError(e.message));
                    });
            })
            .catch((e) => {
                next(new ApiError(e.message));
            });
    }

    // user wants to remove like
    if (!liked) {
        // find blog
        listById(req.params?.id)
            .then((blog) => {
                if (!blog)
                    return next(
                        new ApiError(
                            'Blog cannot be found',
                            httpStatus.NOT_FOUND
                        )
                    );

                // user should liked this blog before
                const isUserLikedThisBlogBefore = blog.likedByUsers.find(
                    (elem) => elem.user_id?.toString() === _id
                );
                if (!isUserLikedThisBlogBefore)
                    res.status(httpStatus.OK).send({
                        message: 'Current user did not liked this blog',
                    });

                // remove current user from array then save and update doc
                blog.likedByUsers = blog.likedByUsers.filter(
                    (elem) => elem.user_id?.toString() !== _id
                );

                blog.save()
                    .then((updatedDoc) => {
                        // decrement num of likes
                        decrementLike(updatedDoc._id)
                            .then((updatedBlog) => {
                                res.status(httpStatus.OK).send(updatedBlog);
                            })
                            .catch((e) => {
                                next(new ApiError(e.message));
                            });
                    })
                    .catch((e) => {
                        next(new ApiError(e.message));
                    });
            })
            .catch((e) => {
                next(new ApiError(e.message));
            });
    }
};

module.exports = {
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
};
