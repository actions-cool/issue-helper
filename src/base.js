require('dotenv').config();
const core = require("@actions/core");
const github = require("@actions/github");
const { Octokit } = require('@octokit/rest');

// **************************************************************************
const ALLREACTIONS = [
  "+1",
  "-1",
  "laugh",
  "confused",
  "heart",
  "hooray",
  "rocket",
  "eyes",
];

const {
  doQueryIssues
} = require('./public.js');

const {
  dealStringToArr,
  dealRandomAssignees,
  testDuplicate,
} = require('./util.js');

// **************************************************************************
const token = core.getInput('token');
const octokit = new Octokit({ auth: `token ${token}` });
const context = github.context;

const contents = core.getInput("contents");

const randomTo = core.getInput("random-to");

// **************************************************************************
async function doAddAssignees (owner, repo, issueNumber, assignees) {
  const arr = dealRandomAssignees(assignees, randomTo);
  await octokit.issues.addAssignees({
    owner,
    repo,
    issue_number: issueNumber,
    assignees: arr
  });
  core.info(`Actions: [add-assignees][${arr}] success!`);
};

async function doAddLabels (owner, repo, issueNumber, labels) {
  await octokit.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels: dealStringToArr(labels)
  });
  core.info(`Actions: [add-labels][${labels}] success!`);
};

async function doCloseIssue (owner, repo, issueNumber) {
  await octokit.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    state: 'closed'
  });
  core.info(`Actions: [close-issue][${issueNumber}] success!`);
};

async function doCreateComment (owner, repo, issueNumber, body) {
  const { data } = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body
  });
  core.info(`Actions: [create-comment][${body}] success!`);
  core.setOutput("comment-id", data.id);

  if (contents) {
    await doCreateCommentContent(owner, repo, data.id, dealStringToArr(contents));
  }
};

async function doCreateCommentContent(owner, repo, commentId, contents) {
  if (contents.length) {
    contents.forEach(async item => {
      if (testContent(item)) {
        await octokit.reactions.createForIssueComment({
          owner,
          repo,
          comment_id: commentId,
          content: item
        });
        core.info(`Actions: [create-reactions][${item}] success!`);
      }
    })
  }
};

async function doCreateIssue (owner, repo, title, body, labels, assignees) {
  let params = {
    owner,
    repo,
    title,
    body,
    labels: dealStringToArr(labels),
    assignees: dealRandomAssignees(assignees, randomTo),
  };

  const { data } = await octokit.issues.create(params);
  core.info(`Actions: [create-issue][${title}] success!`);
  core.setOutput("issue-number", data.number);

  if (contents) {
    await doCreateIssueContent(owner, repo, data.number, dealStringToArr(contents));
  }
};

async function doCreateIssueContent(owner, repo, issueNumber, contents) {
  if (contents.length) {
    contents.forEach(async item => {
      if (testContent(item)) {
        await octokit.reactions.createForIssue({
          owner,
          repo,
          issue_number: issueNumber,
          content: item
        });
        core.info(`Actions: [create-reactions][${item}] success!`);
      }
    })
  }
};

async function doDeleteComment (owner, repo, commentId) {
  await octokit.issues.deleteComment({
    owner,
    repo,
    comment_id: commentId
  });
  core.info(`Actions: [delete-comment][${commentId}] success!`);
};

async function doLockIssue (owner, repo, issueNumber) {
  await octokit.issues.lock({
    owner,
    repo,
    issue_number: issueNumber,
  });
  core.info(`Actions: [lock-issue][${issueNumber}] success!`);
};

async function doMarkDuplicate (owner, repo) {
  if (context.eventName != 'issue_comment') {
    core.info(`This actions only support on 'issue_comment'!`);
    return false;
  }
  if (context.payload.action != 'created') {
    core.info(`This actions only support on 'issue_comment' created!`);
    return false;
  }

  const duplicateCommand = core.getInput("duplicate-command");
  const duplicateLabels = core.getInput("duplicate-labels");
  const removeLables = core.getInput("remove-labels");
  const closeIssue = core.getInput("close-issue");

  const commentId = context.payload.comment.id;
  const commentBody = context.payload.comment.body;
  const issueNumber = context.payload.issue.number;

  const ifCommandInput = !!duplicateCommand;

  if ((ifCommandInput && commentBody.startsWith(duplicateCommand) && commentBody.split(' ')[0] == duplicateCommand) || testDuplicate(commentBody)) {
    if (ifCommandInput) {
      const nextBody = commentBody.replace(duplicateCommand, 'Duplicate of');
      await doUpdateComment(owner, repo, commentId, nextBody, 'replace', true);
    } else if (contents) {
      await doCreateCommentContent(owner, repo, commentId, dealStringToArr(contents));
    }

    if (duplicateLabels) {
      await doAddLabels(owner, repo, issueNumber, duplicateLabels);
    }

    if (removeLables) {
      await doRemoveLabels(owner, repo, issueNumber, removeLables);
    }

    if (closeIssue == 'true') {
      await doCloseIssue(owner, repo, issueNumber);
    }
  } else {
    core.info(`This comment body should start whith 'duplicate-command'`);
  }
};

async function doOpenIssue (owner, repo, issueNumber) {
  await octokit.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    state: 'open'
  });
  core.info(`Actions: [open-issue][${issueNumber}] success!`);
};

async function doRemoveAssignees (owner, repo, issueNumber, assignees) {
  await octokit.issues.removeAssignees({
    owner,
    repo,
    issue_number: issueNumber,
    assignees: dealStringToArr(assignees)
  });
  core.info(`Actions: [remove-assignees][${assignees}] success!`);
};

async function doRemoveLabels (owner, repo, issueNumber, labels) {
  const dealLabels = dealStringToArr(labels);
  dealLabels.forEach(async name => {
    await octokit.issues.removeLabel({
      owner,
      repo,
      issue_number: issueNumber,
      name
    });
    core.info(`Actions: [remove-labels-foreach][${name}] success!`);
  });
  core.info(`Actions: [remove-labels][${labels}] success!`);
};

async function doSetLabels (owner, repo, issueNumber, labels) {
  // 概率性出现问题：https://github.com/octokit/rest.js/issues/1982
  if (labels) {
    await octokit.issues.setLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: dealStringToArr(labels)
    });
    core.info(`Actions: [set-labels][${labels}] success!`);
  }
};

async function doUnlockIssue (owner, repo, issueNumber) {
  await octokit.issues.unlock({
    owner,
    repo,
    issue_number: issueNumber,
  });
  core.info(`Actions: [unlock-issue][${issueNumber}] success!`);
};

async function doUpdateComment (
  owner,
  repo,
  commentId,
  body,
  updateMode,
  ifUpdateBody,
) {
  const comment = await octokit.issues.getComment({
    owner,
    repo,
    comment_id: commentId
  })
  const comment_body = comment.data.body;

  let params = {
    owner,
    repo,
    comment_id: commentId
  };

  if (core.getInput("body") || ifUpdateBody) {
    if (updateMode === 'append') {
      params.body = `${comment_body}\n${body}`;
    } else {
      params.body = body;
    }

    await octokit.issues.updateComment(params);
    core.info(`Actions: [update-comment][${commentId}] success!`);
  }

  if (contents) {
    await doCreateCommentContent(owner, repo, commentId, dealStringToArr(contents));
  }
};

async function doUpdateIssue (
  owner,
  repo,
  issueNumber,
  state,
  title,
  body,
  updateMode,
  assignees,
  labels
) {
  const issue = await octokit.issues.get({
    owner,
    repo,
    issue_number: issueNumber
  })
  const issue_body = issue.data.body;
  const issue_title = issue.data.title;

  let issue_labels = [];
  if (issue.data.labels.length > 0) {
    issue.data.labels.forEach(it =>{
      issue_labels.push(it.name);
    });
  }

  let issue_assignees = [];
  if (issue.data.assignees.length > 0) {
    issue.data.assignees.forEach(it =>{
      issue_assignees.push(it.login);
    });
  }

  let params = {
    owner,
    repo,
    issue_number: issueNumber,
    state
  };

  params.title = core.getInput("title") ? title : issue_title;

  let next_body;
  if (core.getInput("body")) {
    if (updateMode === 'append') {
      next_body = `${issue_body}\n${body}`;
    } else {
      next_body = body;
    }
  } else {
    next_body = issue_body;
  }
  params.body = next_body;

  params.labels = labels ? dealStringToArr(labels) : issue_labels;
  params.assignees = assignees ? dealStringToArr(assignees) : issue_assignees;

  await octokit.issues.update(params);
  core.info(`Actions: [update-issue][${issueNumber}] success!`);

  if (contents) {
    await doCreateIssueContent(owner, repo, issueNumber, contents);
  }
};

async function doWelcome (owner, repo, assignees, labels, body) {
  const context = github.context;
  const isIssue = !!context.payload.issue;
  const issueContents = core.getInput("issue-contents");
  if (!isIssue) {
    core.setFailed("The event that triggered this action must be a issue. Error!");
  } else {
    const auth = context.payload.sender.login;
    core.info(`Actions: [welcome: auth=][${auth}]`);
    const issueNumber = context.issue.number;
    const issues = await doQueryIssues(owner, repo, false, 'all', auth);
    if (issues.length == 0 || (issues.length == 1 && issues[0].number == issueNumber)) {
      if (core.getInput("body")) {
        await doCreateComment(owner, repo, issueNumber, body);
      } else {
        core.info(`Actions: [welcome] no body!`);
      }

      if (assignees) {
        await doAddAssignees(owner, repo, issueNumber, assignees);
      }

      if (labels) {
        await doAddLabels(owner, repo, issueNumber, labels);
      }

      if (issueContents) {
        await doCreateIssueContent(owner, repo, issueNumber, dealStringToArr(issueContents));
      }
    } else {
      core.info(`Actions: [welcome][${auth}] is not first time!`);
    }
  }
};

// **************************************************************************
function testContent(con) {
  if (ALLREACTIONS.includes(con)) {
    return true;
  } else {
    core.setFailed("This actions not supported!");
    return false;
  }
};

// **************************************************************************
module.exports = {
  doAddAssignees,
  doAddLabels,
  doCloseIssue,
  doCreateComment,
  doCreateCommentContent,
  doCreateIssue,
  doCreateIssueContent,
  doDeleteComment,
  doMarkDuplicate,
  doLockIssue,
  doOpenIssue,
  doRemoveAssignees,
  doRemoveLabels,
  doSetLabels,
  doUnlockIssue,
  doUpdateComment,
  doUpdateIssue,
  doWelcome,
};
