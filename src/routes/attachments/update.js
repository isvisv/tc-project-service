'use strict'
import validate from 'express-validation'
import _ from 'lodash'
import Joi from 'joi'

import models from '../../models'
import util from '../../util'
import { middleware as tcMiddleware } from 'tc-core-library-js'

/**
 * API to update a project member.
 */
const permissions = tcMiddleware.permissions

const updateProjectAttachmentValidation = {
  body: {
    param: Joi.object().keys({
      title: Joi.string().required(),
      description: Joi.string().optional().allow(null)
    })
  }
}

module.exports = [
  // handles request validations
  validate(updateProjectAttachmentValidation),
  permissions('project.updateAttachment'),
  /**
   * Update a attachment if the user has access
   */
  (req, res, next) => {
    let updatedProps = req.body.param
    const projectId = _.parseInt(req.params.projectId)
    const attachmentId = _.parseInt(req.params.id)
    updatedProps.updatedBy = req.authUser.userId

    models.sequelize.transaction(() => {
      return models.ProjectAttachment.update(updatedProps, {
          where: { id: attachmentId, projectId: projectId },
          returning: true
        })
        .then(resp => {
          const affectedCount = resp.shift()
          if (affectedCount == 0) {
            // handle 404
            let err = new Error(`project attachment not found for project id ${projectId} and member id ${attachmentId}`)
            err.status = 404
            return Promise.reject(err)
          }

          const attachment = resp.shift()[0]
          req.log.debug('updated project attachment', JSON.stringify(attachment, null, 2))
          res.json(util.wrapResponse(req.id, attachment))
        })
        .catch((err) => next(err))
    })
  }
]
